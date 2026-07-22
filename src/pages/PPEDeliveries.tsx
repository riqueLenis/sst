import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../store/AppContext";
import {
  Briefcase,
  Eye,
  HardHat,
  LoaderCircle,
  Plus,
  ShieldCheck,
  FileText,
  Download,
  Search,
} from "lucide-react";
import { exportTableToPDF } from "../lib/pdfUtils";
import FacePhotoCapture from "../components/FacePhotoCapture";
import SignaturePad from "../components/SignaturePad";
import type { PPEDelivery } from "../types";
import { useAuth } from "../store/AuthContext";
import {
  buildPPEDeliveryDeclarationText,
  formatPPEDeliveryReason,
  formatPPEDeliverySignedAt,
  generatePPEDeliveryPdf,
} from "../lib/ppeDeliveryPdf";

type DeliveryFormState = {
  employeeId: string;
  ppeId: string;
  quantity: number;
  deliveryDate: string;
  reason: string;
  replacementReason: string;
  status: "delivered";
  employeeSignature: string;
  signedAt: string;
  employeeFacePhoto: string;
  facePhotoCapturedAt: string;
};

export default function PPEDeliveries() {
  const {
    ppeDeliveries,
    employees,
    roles,
    ppes,
    companies,
    addPPEDelivery,
    updatePPEDelivery,
  } = useAppContext();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [signatureFeedback, setSignatureFeedback] = useState<string | null>(
    null,
  );
  const [replacementReasonError, setReplacementReasonError] = useState<
    string | null
  >(null);
  const [facePhotoError, setFacePhotoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [facePhotoFeedback, setFacePhotoFeedback] = useState<string | null>(
    null,
  );

  const activeEmployees = employees.filter(
    (employee) => employee.status === "active",
  );
  const availablePPEs = ppes.filter((ppe) => ppe.stockQuantity > 0);

  const initialFormState: DeliveryFormState = {
    employeeId: "",
    ppeId: "",
    quantity: 1,
    deliveryDate: new Date().toISOString().split("T")[0],
    reason: "Admissão",
    replacementReason: "",
    status: "delivered",
    employeeSignature: "",
    signedAt: "",
    employeeFacePhoto: "",
    facePhotoCapturedAt: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  const selectedEmployee = employees.find(
    (employee) => employee.id === formData.employeeId,
  );
  const selectedRole = roles.find(
    (role) => role.id === selectedEmployee?.roleId,
  );
  const selectedCompany = companies.find(
    (company) => company.id === selectedEmployee?.companyId,
  );
  const selectedRoleRequiredPpeIds = selectedRole?.requiredPpeIds ?? [];
  const requiredRolePpeIdSet = new Set(selectedRoleRequiredPpeIds);
  const requiredRolePPEs = selectedRoleRequiredPpeIds.flatMap((ppeId) => {
    const ppe = ppes.find((currentPpe) => currentPpe.id === ppeId);
    return ppe ? [ppe] : [];
  });
  const requiredAvailablePPEs = availablePPEs.filter((ppe) =>
    requiredRolePpeIdSet.has(ppe.id),
  );
  const otherAvailablePPEs = availablePPEs.filter(
    (ppe) => !requiredRolePpeIdSet.has(ppe.id),
  );
  const declarationText = selectedCompany
    ? buildPPEDeliveryDeclarationText(selectedCompany.name)
    : "Selecione um colaborador para carregar o termo de entrega de EPI para leitura antes da assinatura e da foto.";
  const canManageDeliveries =
    user?.role === "admin" || user?.role === "manager";

  const buildSuggestedPpeId = (employeeId: string) => {
    const employee = employees.find((currentEmployee) => currentEmployee.id === employeeId);
    const role = roles.find((currentRole) => currentRole.id === employee?.roleId);
    const matchingRequiredPpeId = (role?.requiredPpeIds ?? []).find((ppeId) =>
      availablePPEs.some((ppe) => ppe.id === ppeId),
    );

    return matchingRequiredPpeId ?? availablePPEs[0]?.id ?? "";
  };

  const resetForm = (overrides: Partial<DeliveryFormState> = {}) => {
    setFormData({ ...initialFormState, ...overrides });
    setReplacementReasonError(null);
    setSignatureError(null);
    setSignatureFeedback(null);
    setFacePhotoError(null);
    setFacePhotoFeedback(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const updateFormField = <K extends keyof DeliveryFormState>(
    field: K,
    value: DeliveryFormState[K],
  ) => {
    const shouldResetSignature =
      field !== "employeeSignature" &&
      field !== "signedAt" &&
      field !== "employeeFacePhoto" &&
      field !== "facePhotoCapturedAt" &&
      (Boolean(formData.employeeSignature) ||
        Boolean(formData.employeeFacePhoto)) &&
      formData[field] !== value;

    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "reason" && value !== "Substituição"
        ? {
            replacementReason: "",
          }
        : {}),
      ...(shouldResetSignature
        ? {
            employeeSignature: "",
            signedAt: "",
            employeeFacePhoto: "",
            facePhotoCapturedAt: "",
          }
        : {}),
    }));

    if (shouldResetSignature) {
      setSignatureError(
        "A assinatura digital precisa ser refeita após alterar os dados da entrega.",
      );
      setSignatureFeedback(
        "Assinatura removida porque os dados da entrega foram alterados.",
      );
      setFacePhotoError(
        "A foto facial precisa ser capturada novamente após alterar os dados da entrega.",
      );
      setFacePhotoFeedback(
        "Foto facial removida porque os dados da entrega foram alterados.",
      );
    }

    if (field === "replacementReason") {
      setReplacementReasonError(null);
    }

    if (field === "reason" && value !== "Substituição") {
      setReplacementReasonError(null);
    }
  };

  const handleSignatureChange = (signature: string) => {
    setFormData((prev) => ({
      ...prev,
      employeeSignature: signature,
      signedAt: new Date().toISOString(),
    }));
    setSignatureError(null);
    setSignatureFeedback(null);
  };

  const handleFacePhotoChange = (photo: string) => {
    setFormData((prev) => ({
      ...prev,
      employeeFacePhoto: photo,
      facePhotoCapturedAt: new Date().toISOString(),
    }));
    setFacePhotoError(null);
    setFacePhotoFeedback(null);
  };

  const handleSignatureClear = () => {
    setFormData((prev) => ({
      ...prev,
      employeeSignature: "",
      signedAt: "",
    }));
    setSignatureError(
      "Assinatura digital obrigatória para concluir a entrega.",
    );
    setSignatureFeedback(
      "Assinatura removida. Refaça para liberar o salvamento.",
    );
  };

  const handleFacePhotoClear = () => {
    setFormData((prev) => ({
      ...prev,
      employeeFacePhoto: "",
      facePhotoCapturedAt: "",
    }));
    setFacePhotoError("Foto facial obrigatória para concluir a entrega.");
    setFacePhotoFeedback(
      "Foto facial removida. Capture novamente para liberar o salvamento.",
    );
  };

  const openNewDeliveryModal = () => {
    resetForm({
      employeeId: activeEmployees[0]?.id ?? "",
      ppeId: buildSuggestedPpeId(activeEmployees[0]?.id ?? ""),
    });
    setIsModalOpen(true);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const nextPpeId = buildSuggestedPpeId(employeeId);
    const shouldResetSignature =
      employeeId !== formData.employeeId &&
      (Boolean(formData.employeeSignature) || Boolean(formData.employeeFacePhoto));

    setFormData((prev) => ({
      ...prev,
      employeeId,
      ppeId: nextPpeId || prev.ppeId,
      ...(shouldResetSignature
        ? {
            employeeSignature: "",
            signedAt: "",
            employeeFacePhoto: "",
            facePhotoCapturedAt: "",
          }
        : {}),
    }));

    if (shouldResetSignature) {
      setSignatureError(
        "A assinatura digital precisa ser refeita após alterar os dados da entrega.",
      );
      setSignatureFeedback(
        "Assinatura removida porque os dados da entrega foram alterados.",
      );
      setFacePhotoError(
        "A foto facial precisa ser capturada novamente após alterar os dados da entrega.",
      );
      setFacePhotoFeedback(
        "Foto facial removida porque os dados da entrega foram alterados.",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageDeliveries) {
      window.alert(
        "Somente usuários com perfil Gestor ou Admin podem registrar ou alterar entregas de EPI.",
      );
      return;
    }

    let hasError = false;

    if (
      formData.reason === "Substituição" &&
      !formData.replacementReason.trim()
    ) {
      setReplacementReasonError(
        "Informe o motivo da substituição para continuar com a entrega.",
      );
      hasError = true;
    }

    if (!formData.employeeSignature) {
      setSignatureError(
        "Assinatura digital obrigatória para concluir a entrega.",
      );
      hasError = true;
    }

    if (!formData.employeeFacePhoto) {
      setFacePhotoError("Foto facial obrigatória para concluir a entrega.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await addPPEDelivery(formData);
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturn = (id: string) => {
    if (!canManageDeliveries) {
      window.alert(
        "Somente usuários com perfil Gestor ou Admin podem registrar devoluções de EPI.",
      );
      return;
    }

    if (window.confirm("Confirmar devolução deste EPI?")) {
      updatePPEDelivery(id, {
        status: "returned",
        returnDate: new Date().toISOString().split("T")[0],
      });
    }
  };

  const generatePDF = (delivery: PPEDelivery) => {
    const employee = employees.find((e) => e.id === delivery.employeeId);
    const ppe = ppes.find((p) => p.id === delivery.ppeId);
    const company = companies.find((c) => c.id === employee?.companyId);

    if (!employee || !ppe || !company) {
      return;
    }

    void generatePPEDeliveryPdf({ delivery, employee, ppe, company });
  };

  const handleExportListPDF = () => {
    const columns = [
      "Data",
      "Colaborador",
      "EPI",
      "Qtd",
      "Motivo",
      "Assinatura",
      "Foto facial",
      "Status",
    ];
    const data = filteredDeliveries.map((d) => {
      const employee = employees.find((e) => e.id === d.employeeId);
      const ppe = ppes.find((p) => p.id === d.ppeId);
      return [
        new Date(d.deliveryDate).toLocaleDateString("pt-BR"),
        employee?.name || "N/A",
        ppe?.name || "N/A",
        d.quantity.toString(),
        formatPPEDeliveryReason(d),
        d.employeeSignature ? "Digital capturada" : "Pendente",
        d.employeeFacePhoto ? "Capturada" : "Pendente",
        d.status === "delivered"
          ? "Entregue"
          : d.status === "returned"
            ? "Devolvido"
            : "Extraviado",
      ];
    });
    exportTableToPDF(
      "Relatório de Entregas de EPI",
      columns,
      data,
      "entregas_epis_sst_pro",
    );
  };

  const filteredDeliveries = ppeDeliveries.filter((d) => {
    const employee = employees.find((e) => e.id === d.employeeId);
    const ppe = ppes.find((p) => p.id === d.ppeId);
    const searchLower = searchTerm.toLowerCase();
    const reasonLabel = formatPPEDeliveryReason(d).toLowerCase();

    return (
      employee?.name.toLowerCase().includes(searchLower) ||
      ppe?.name.toLowerCase().includes(searchLower) ||
      reasonLabel.includes(searchLower)
    );
  });

  const getDeliveryStatusLabel = (status: PPEDelivery["status"]) => {
    if (status === "delivered") {
      return "Entregue";
    }

    if (status === "returned") {
      return "Devolvido";
    }

    return "Extraviado";
  };

  const getDeliveryStatusClassName = (status: PPEDelivery["status"]) => {
    if (status === "delivered") {
      return "status-pill border border-blue-100 bg-blue-50 text-blue-700";
    }

    if (status === "returned") {
      return "status-pill border border-emerald-100 bg-emerald-50 text-emerald-700";
    }

    return "status-pill border border-red-100 bg-red-50 text-red-700";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            Entregas de EPI
          </h1>
          <p className="text-slate-500 mt-1">
            Registre e acompanhe as entregas de equipamentos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportListPDF}
            disabled={ppeDeliveries.length === 0}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Lista (PDF)
          </button>
          {canManageDeliveries && (
            <button
              onClick={openNewDeliveryModal}
              disabled={
                activeEmployees.length === 0 || availablePPEs.length === 0
              }
              className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 h-10 px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Entrega
            </button>
          )}
        </div>
      </div>

      {!canManageDeliveries && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          O perfil Técnico possui acesso de consulta às entregas de EPI. O registro de novas entregas e devoluções permanece sob responsabilidade do Gestor ou Admin.
        </div>
      )}

      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por colaborador, EPI ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div className="mobile-list p-4 lg:hidden">
          {filteredDeliveries.map((delivery) => {
            const employee = employees.find((e) => e.id === delivery.employeeId);
            const ppe = ppes.find((p) => p.id === delivery.ppeId);

            return (
              <article key={delivery.id} className="mobile-record">
                <div className="mobile-record-header">
                  <div>
                    <p className="mobile-record-title">
                      {employee?.name || "Não encontrado"}
                    </p>
                    <p className="mobile-record-copy">
                      {new Date(delivery.deliveryDate).toLocaleDateString("pt-BR")} • {ppe?.name || "Não encontrado"}
                    </p>
                  </div>

                  <span className={getDeliveryStatusClassName(delivery.status)}>
                    {getDeliveryStatusLabel(delivery.status)}
                  </span>
                </div>

                <div className="mobile-record-grid">
                  <div>
                    <p className="mobile-record-label">Quantidade</p>
                    <p className="mobile-record-value">{delivery.quantity}</p>
                  </div>
                  <div>
                    <p className="mobile-record-label">Motivo</p>
                    <p className="mobile-record-value">
                      {formatPPEDeliveryReason(delivery)}
                    </p>
                  </div>
                  <div>
                    <p className="mobile-record-label">Assinatura</p>
                    <p className="mobile-record-value">
                      {delivery.employeeSignature ? "Digital" : "Pendente"}
                    </p>
                  </div>
                  <div>
                    <p className="mobile-record-label">Foto</p>
                    <p className="mobile-record-value">
                      {delivery.employeeFacePhoto ? "Capturada" : "Pendente"}
                    </p>
                  </div>
                </div>

                <div className="mobile-record-actions">
                  <Link
                    to={`/entregas/${delivery.id}`}
                    className="icon-action icon-action-primary"
                    aria-label={`Ver detalhe da entrega de ${employee?.name || "colaborador"}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => generatePDF(delivery)}
                    className="icon-action icon-action-primary"
                    type="button"
                    aria-label={`Gerar ficha PDF da entrega de ${employee?.name || "colaborador"}`}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  {canManageDeliveries && delivery.status === "delivered" && (
                    <button
                      onClick={() => handleReturn(delivery.id)}
                      className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      type="button"
                    >
                      Devolver
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {filteredDeliveries.length === 0 && (
            <div className="empty-state rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70">
              <ShieldCheck className="h-10 w-10 text-slate-300" />
              <p className="empty-state-title">Nenhuma entrega encontrada</p>
              <p className="empty-state-copy">
                {canManageDeliveries
                  ? "Ajuste sua busca ou registre uma nova entrega."
                  : "Ajuste sua busca para localizar entregas já registradas."}
              </p>
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">EPI</th>
                <th className="px-6 py-4">Qtd</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4">Assinatura</th>
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveries.map((delivery) => {
                const employee = employees.find(
                  (e) => e.id === delivery.employeeId,
                );
                const ppe = ppes.find((p) => p.id === delivery.ppeId);

                return (
                  <tr
                    key={delivery.id}
                    className="bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(delivery.deliveryDate).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {employee?.name || "Não encontrado"}
                    </td>
                    <td className="px-6 py-4">
                      {ppe?.name || "Não encontrado"}
                    </td>
                    <td className="px-6 py-4">{delivery.quantity}</td>
                    <td className="px-6 py-4">
                      {formatPPEDeliveryReason(delivery)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          delivery.employeeSignature
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {delivery.employeeSignature ? "Digital" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          delivery.employeeFacePhoto
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {delivery.employeeFacePhoto ? "Capturada" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          delivery.status === "delivered"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : delivery.status === "returned"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-red-50 text-red-700 border-red-100"
                        }`}
                      >
                        {getDeliveryStatusLabel(delivery.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/entregas/${delivery.id}`}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ver detalhe da entrega"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => generatePDF(delivery)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Gerar Ficha (PDF)"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {canManageDeliveries && delivery.status === "delivered" && (
                          <button
                            onClick={() => handleReturn(delivery.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            Devolver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <ShieldCheck className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-900">
                        Nenhuma entrega encontrada
                      </p>
                      <p className="text-sm">
                        {canManageDeliveries
                          ? "Ajuste sua busca ou registre uma nova entrega."
                          : "Ajuste sua busca para localizar entregas já registradas."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="my-6 bg-white rounded-2xl shadow-xl w-full max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <h3 className="text-lg font-bold text-slate-900">
                Registrar Entrega de EPI
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="sr-only">Fechar</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Colaborador
                </label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>
                    Selecione um colaborador
                  </option>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - CPF {employee.cpf}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Colaborador
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedEmployee.name}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        CPF
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedEmployee.cpf}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Cargo
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedRole?.name || "Cargo não vinculado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Briefcase className="h-4 w-4 text-blue-600" />
                        EPIs obrigatórios do cargo
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedRole
                          ? `Cargo selecionado: ${selectedRole.name}`
                          : "O colaborador não possui um cargo válido para sugerir EPIs."}
                      </p>
                    </div>

                    {requiredRolePPEs.length > 0 && (
                      <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {requiredRolePPEs.length} obrigatório(s)
                      </span>
                    )}
                  </div>

                  {selectedRole ? (
                    requiredRolePPEs.length > 0 ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {requiredRolePPEs.map((ppe) => {
                          const isSelected = formData.ppeId === ppe.id;
                          const isOutOfStock = ppe.stockQuantity <= 0;

                          return (
                            <button
                              key={ppe.id}
                              type="button"
                              onClick={() => updateFormField("ppeId", ppe.id)}
                              disabled={isOutOfStock}
                              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                                isSelected
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              } ${
                                isOutOfStock
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    <HardHat className="h-4 w-4 text-blue-600" />
                                    {ppe.name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    CA {ppe.ca}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                    isOutOfStock
                                      ? "border-red-100 bg-red-50 text-red-700"
                                      : "border-emerald-100 bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {isOutOfStock
                                    ? "Sem estoque"
                                    : `${ppe.stockQuantity} un`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        Nenhum EPI obrigatório está vinculado a este cargo ainda.
                      </p>
                    )
                  ) : (
                    <p className="mt-3 text-sm text-amber-700">
                      Atualize o colaborador com um cargo válido para liberar a sugestão automática de EPIs.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  EPI
                </label>
                <select
                  required
                  value={formData.ppeId}
                  onChange={(e) => updateFormField("ppeId", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>
                    Selecione um EPI
                  </option>

                  {requiredAvailablePPEs.length > 0 && (
                    <optgroup label="EPIs vinculados ao cargo">
                      {requiredAvailablePPEs.map((ppe) => (
                        <option key={ppe.id} value={ppe.id}>
                          {ppe.name} (CA: {ppe.ca}) - Estoque: {ppe.stockQuantity}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {otherAvailablePPEs.length > 0 && (
                    <optgroup
                      label={
                        requiredAvailablePPEs.length > 0
                          ? "Demais EPIs disponíveis"
                          : "EPIs disponíveis"
                      }
                    >
                      {otherAvailablePPEs.map((ppe) => (
                        <option key={ppe.id} value={ppe.id}>
                          {ppe.name} (CA: {ppe.ca}) - Estoque: {ppe.stockQuantity}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {requiredAvailablePPEs.length > 0 && (
                  <p className="mt-2 text-xs text-blue-700">
                    Os EPIs vinculados ao cargo do colaborador aparecem primeiro na lista.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      updateFormField("quantity", parseInt(e.target.value) || 1)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Data da Entrega
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.deliveryDate}
                    onChange={(e) =>
                      updateFormField("deliveryDate", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Motivo
                </label>
                <select
                  required
                  value={formData.reason}
                  onChange={(e) => updateFormField("reason", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="Admissão">Admissão</option>
                  <option value="Substituição">Substituição</option>
                  <option value="Perda/Extravio">Perda/Extravio</option>
                  <option value="Dano">Dano</option>
                  <option value="Validade">Validade</option>
                </select>
              </div>

              {formData.reason === "Substituição" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Motivo da substituição
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.replacementReason}
                    onChange={(e) =>
                      updateFormField("replacementReason", e.target.value)
                    }
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      replacementReasonError
                        ? "border-red-300 bg-red-50/40"
                        : "border-slate-200"
                    }`}
                    placeholder="Descreva o motivo da substituição"
                  />
                  {replacementReasonError && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {replacementReasonError}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Termo da Entrega de EPI
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Leia o texto abaixo antes de registrar a assinatura digital e a foto facial do colaborador.
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {declarationText}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <SignaturePad
                  value={formData.employeeSignature}
                  signerName={selectedEmployee?.name}
                  onChange={handleSignatureChange}
                  onClear={handleSignatureClear}
                  error={signatureError}
                />

                {formData.signedAt && (
                  <p className="mt-3 text-xs font-medium text-emerald-700">
                    Assinatura capturada em{" "}
                    {formatPPEDeliverySignedAt(formData.signedAt)}.
                  </p>
                )}

                {signatureFeedback && !formData.employeeSignature && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    {signatureFeedback}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <FacePhotoCapture
                  value={formData.employeeFacePhoto}
                  subjectName={selectedEmployee?.name}
                  onChange={handleFacePhotoChange}
                  onClear={handleFacePhotoClear}
                  error={facePhotoError}
                />

                {formData.facePhotoCapturedAt && (
                  <p className="mt-3 text-xs font-medium text-emerald-700">
                    Foto facial capturada em{" "}
                    {formatPPEDeliverySignedAt(formData.facePhotoCapturedAt)}.
                  </p>
                )}

                {facePhotoFeedback && !formData.employeeFacePhoto && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    {facePhotoFeedback}
                  </p>
                )}
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    !formData.employeeId ||
                    !formData.ppeId ||
                    !formData.employeeSignature ||
                    !formData.employeeFacePhoto ||
                    isSaving
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {isSaving ? "Registrando..." : "Registrar Entrega com Assinatura e Foto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

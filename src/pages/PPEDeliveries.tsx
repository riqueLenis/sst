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
import { formatDate } from "../lib/dates";
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

// Motivos em que o técnico escolhe manualmente quais EPIs entregar.
// Na Admissão a entrega segue o fluxo padrão: o kit obrigatório do cargo.
const REASONS_WITH_PPE_SELECTION = [
  "Substituição",
  "Perda/Extravio",
  "Dano",
  "Validade",
];

type DeliveryFormState = {
  employeeId: string;
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
    addPPEDeliveries,
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
  // EPIs selecionados para entrega (ppeId -> quantidade). Um registro por EPI.
  const [selectedPpeQuantities, setSelectedPpeQuantities] = useState<
    Record<string, number>
  >({});

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
  const otherAvailablePPEs = availablePPEs.filter(
    (ppe) => !requiredRolePpeIdSet.has(ppe.id),
  );
  // Admissão não exibe checkboxes: entrega o kit obrigatório do cargo.
  const allowsPpeSelection = REASONS_WITH_PPE_SELECTION.includes(
    formData.reason,
  );
  const admissionPPEs = requiredRolePPEs.filter(
    (ppe) => ppe.id in selectedPpeQuantities,
  );
  const declarationText = selectedCompany
    ? buildPPEDeliveryDeclarationText(selectedCompany.name)
    : "Selecione um colaborador para carregar o termo de entrega de EPI para leitura antes da assinatura e da foto.";
  const canManageDeliveries =
    user?.role === "admin" || user?.role === "manager";

  // Pré-seleciona todos os EPIs obrigatórios do cargo que têm estoque.
  const buildDefaultSelection = (employeeId: string): Record<string, number> => {
    const employee = employees.find(
      (currentEmployee) => currentEmployee.id === employeeId,
    );
    const role = roles.find((currentRole) => currentRole.id === employee?.roleId);
    const selection: Record<string, number> = {};

    (role?.requiredPpeIds ?? []).forEach((ppeId) => {
      const ppe = ppes.find((currentPpe) => currentPpe.id === ppeId);
      if (ppe && ppe.stockQuantity > 0) {
        selection[ppeId] = 1;
      }
    });

    return selection;
  };

  const resetForm = (overrides: Partial<DeliveryFormState> = {}) => {
    setFormData({ ...initialFormState, ...overrides });
    setSelectedPpeQuantities({});
    setReplacementReasonError(null);
    setSignatureError(null);
    setSignatureFeedback(null);
    setFacePhotoError(null);
    setFacePhotoFeedback(null);
  };

  // Ao alterar os EPIs selecionados, a assinatura/foto capturadas ficam
  // inválidas (o termo assinado precisa refletir os EPIs corretos).
  const invalidateCapturedProofs = () => {
    if (!formData.employeeSignature && !formData.employeeFacePhoto) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      employeeSignature: "",
      signedAt: "",
      employeeFacePhoto: "",
      facePhotoCapturedAt: "",
    }));
    setSignatureError(
      "A assinatura precisa ser refeita após alterar os EPIs selecionados.",
    );
    setSignatureFeedback(
      "Assinatura removida porque os EPIs selecionados foram alterados.",
    );
    setFacePhotoError(
      "A foto facial precisa ser capturada novamente após alterar os EPIs.",
    );
    setFacePhotoFeedback(
      "Foto facial removida porque os EPIs selecionados foram alterados.",
    );
  };

  const togglePpeSelection = (ppeId: string) => {
    setSelectedPpeQuantities((prev) => {
      const next = { ...prev };
      if (ppeId in next) {
        delete next[ppeId];
      } else {
        next[ppeId] = 1;
      }
      return next;
    });
    invalidateCapturedProofs();
  };

  const setPpeQuantity = (ppeId: string, quantity: number) => {
    setSelectedPpeQuantities((prev) => ({
      ...prev,
      [ppeId]: Math.max(1, Number.isFinite(quantity) ? Math.trunc(quantity) : 1),
    }));
    invalidateCapturedProofs();
  };

  const selectedPpeCount = Object.keys(selectedPpeQuantities).length;

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
    const employeeId = activeEmployees[0]?.id ?? "";
    resetForm({ employeeId });
    setSelectedPpeQuantities(buildDefaultSelection(employeeId));
    setIsModalOpen(true);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const shouldResetSignature =
      employeeId !== formData.employeeId &&
      (Boolean(formData.employeeSignature) || Boolean(formData.employeeFacePhoto));

    setFormData((prev) => ({
      ...prev,
      employeeId,
      ...(shouldResetSignature
        ? {
            employeeSignature: "",
            signedAt: "",
            employeeFacePhoto: "",
            facePhotoCapturedAt: "",
          }
        : {}),
    }));

    // Recarrega os EPIs obrigatórios do novo colaborador.
    setSelectedPpeQuantities(buildDefaultSelection(employeeId));

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

  const handleReasonChange = (reason: string) => {
    updateFormField("reason", reason);

    // Ao voltar para Admissão, a seleção volta a ser o kit obrigatório do
    // cargo (o técnico pode ter marcado/desmarcado itens em outro motivo).
    if (!REASONS_WITH_PPE_SELECTION.includes(reason)) {
      setSelectedPpeQuantities(buildDefaultSelection(formData.employeeId));
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

    if (selectedPpeCount === 0) {
      window.alert(
        allowsPpeSelection
          ? "Selecione pelo menos um EPI para registrar a entrega."
          : "O cargo deste colaborador não possui EPIs obrigatórios com estoque disponível. Vincule os EPIs ao cargo (ou reponha o estoque) para registrar a entrega de admissão.",
      );
      hasError = true;
    }

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
      // Uma entrega por EPI selecionado, todas no mesmo lote (batchId) e
      // compartilhando assinatura, foto, data e motivo.
      const batchId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const deliveries = Object.entries(selectedPpeQuantities).map(
        ([ppeId, quantity]) => ({
          employeeId: formData.employeeId,
          ppeId,
          batchId,
          quantity,
          deliveryDate: formData.deliveryDate,
          reason: formData.reason,
          ...(formData.reason === "Substituição"
            ? { replacementReason: formData.replacementReason }
            : {}),
          status: formData.status,
          employeeSignature: formData.employeeSignature,
          signedAt: formData.signedAt,
          employeeFacePhoto: formData.employeeFacePhoto,
          facePhotoCapturedAt: formData.facePhotoCapturedAt,
        }),
      );

      await addPPEDeliveries(deliveries);
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
    const company = companies.find((c) => c.id === employee?.companyId);
    const employeeRole = roles.find((role) => role.id === employee?.roleId);

    if (!employee || !company) {
      return;
    }

    // Agrupa todos os EPIs entregues no mesmo lote (mesma assinatura/foto).
    const batchDeliveries = delivery.batchId
      ? ppeDeliveries.filter((item) => item.batchId === delivery.batchId)
      : [delivery];

    const items = batchDeliveries.flatMap((item) => {
      const ppe = ppes.find((p) => p.id === item.ppeId);
      return ppe ? [{ delivery: item, ppe }] : [];
    });

    if (items.length === 0) {
      return;
    }

    void generatePPEDeliveryPdf({
      items,
      employee,
      company,
      roleName: employeeRole?.name,
    });
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
        formatDate(d.deliveryDate),
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
      {
        tag: "Controle de EPI · NR-06",
        description:
          "Entregas registradas com colaborador, equipamento, motivo e comprovações (assinatura digital e foto facial).",
        highlights: [
          { label: "Entregas", value: String(data.length) },
          {
            label: "Unidades",
            value: String(
              filteredDeliveries.reduce(
                (total, delivery) => total + delivery.quantity,
                0,
              ),
            ),
          },
          {
            label: "Assinadas",
            value: String(
              filteredDeliveries.filter((delivery) => delivery.employeeSignature)
                .length,
            ),
          },
          {
            label: "Devolvidas",
            value: String(
              filteredDeliveries.filter(
                (delivery) => delivery.status === "returned",
              ).length,
            ),
          },
        ],
      },
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
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            Entregas de EPI
          </h1>
          <p className="mt-1">
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
                      {formatDate(delivery.deliveryDate)} • {ppe?.name || "Não encontrado"}
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
                      {formatDate(delivery.deliveryDate)}
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Motivo
                </label>
                <select
                  required
                  value={formData.reason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="Admissão">Admissão</option>
                  <option value="Substituição">Substituição</option>
                  <option value="Perda/Extravio">Perda/Extravio</option>
                  <option value="Dano">Dano</option>
                  <option value="Validade">Validade</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  {allowsPpeSelection
                    ? "Selecione abaixo quais EPIs serão entregues."
                    : "Entrega inicial: todos os EPIs obrigatórios do cargo com estoque são entregues automaticamente."}
                </p>
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
                      !allowsPpeSelection ? (
                        // Admissão: kit obrigatório do cargo, sem seleção manual.
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-slate-500">
                            Entrega de admissão: os EPIs obrigatórios do cargo
                            são entregues automaticamente.
                          </p>
                          {requiredRolePPEs.map((ppe) => {
                            const isOutOfStock = ppe.stockQuantity <= 0;

                            return (
                              <div
                                key={ppe.id}
                                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                                  isOutOfStock
                                    ? "border-slate-200 bg-white opacity-60"
                                    : "border-blue-200 bg-blue-50"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    <HardHat className="h-4 w-4 text-blue-600" />
                                    {ppe.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    CA {ppe.ca} •{" "}
                                    {isOutOfStock
                                      ? "Sem estoque — não será entregue"
                                      : `${ppe.stockQuantity} un em estoque`}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700">
                                  {isOutOfStock
                                    ? "—"
                                    : `${selectedPpeQuantities[ppe.id] ?? 1} un`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-slate-500">
                            Marque os EPIs a entregar. Por padrão, todos os
                            obrigatórios com estoque já vêm selecionados.
                          </p>
                          {requiredRolePPEs.map((ppe) => {
                            const isOutOfStock = ppe.stockQuantity <= 0;
                            const isSelected = ppe.id in selectedPpeQuantities;

                            return (
                              <label
                                key={ppe.id}
                                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                                  isSelected
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-slate-200 bg-white"
                                } ${
                                  isOutOfStock
                                    ? "cursor-not-allowed opacity-60"
                                    : "cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isOutOfStock}
                                  onChange={() => togglePpeSelection(ppe.id)}
                                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    <HardHat className="h-4 w-4 text-blue-600" />
                                    {ppe.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    CA {ppe.ca} •{" "}
                                    {isOutOfStock
                                      ? "Sem estoque"
                                      : `${ppe.stockQuantity} un em estoque`}
                                  </p>
                                </div>
                                {isSelected && !isOutOfStock && (
                                  <input
                                    type="number"
                                    min="1"
                                    max={ppe.stockQuantity}
                                    value={selectedPpeQuantities[ppe.id]}
                                    onClick={(event) => event.preventDefault()}
                                    onChange={(event) =>
                                      setPpeQuantity(
                                        ppe.id,
                                        parseInt(event.target.value, 10) || 1,
                                      )
                                    }
                                    className="w-16 shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm"
                                    aria-label={`Quantidade de ${ppe.name}`}
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        {allowsPpeSelection
                          ? "Nenhum EPI obrigatório está vinculado a este cargo. Use a lista abaixo para adicionar EPIs manualmente."
                          : "Nenhum EPI obrigatório está vinculado a este cargo. Vincule os EPIs ao cargo em Setores & Cargos para registrar a entrega de admissão."}
                      </p>
                    )
                  ) : (
                    <p className="mt-3 text-sm text-amber-700">
                      Atualize o colaborador com um cargo válido para carregar os
                      EPIs obrigatórios.
                    </p>
                  )}
                </div>
              )}

              {allowsPpeSelection && otherAvailablePPEs.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Outros EPIs disponíveis{" "}
                    <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <div className="space-y-2">
                    {otherAvailablePPEs.map((ppe) => {
                      const isSelected = ppe.id in selectedPpeQuantities;

                      return (
                        <label
                          key={ppe.id}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                            isSelected
                              ? "border-blue-200 bg-blue-50"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePpeSelection(ppe.id)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {ppe.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              CA {ppe.ca} • {ppe.stockQuantity} un em estoque
                            </p>
                          </div>
                          {isSelected && (
                            <input
                              type="number"
                              min="1"
                              max={ppe.stockQuantity}
                              value={selectedPpeQuantities[ppe.id]}
                              onClick={(event) => event.preventDefault()}
                              onChange={(event) =>
                                setPpeQuantity(
                                  ppe.id,
                                  parseInt(event.target.value, 10) || 1,
                                )
                              }
                              className="w-16 shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm"
                              aria-label={`Quantidade de ${ppe.name}`}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm font-medium text-blue-800">
                {allowsPpeSelection
                  ? selectedPpeCount > 0
                    ? `${selectedPpeCount} EPI(s) selecionado(s) para entrega.`
                    : "Nenhum EPI selecionado ainda."
                  : admissionPPEs.length > 0
                    ? `${admissionPPEs.length} EPI(s) obrigatório(s) do cargo serão entregues.`
                    : "Nenhum EPI obrigatório com estoque disponível para este cargo."}
              </div>

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
                    selectedPpeCount === 0 ||
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

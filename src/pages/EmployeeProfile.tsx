import React from "react";
import { useParams, Link } from "react-router-dom";
import { useAppContext } from "../store/AppContext";
import {
  ArrowLeft,
  User,
  Building2,
  Briefcase,
  Calendar,
  FileText,
  Download,
  ShieldCheck,
} from "lucide-react";
import { createPdfDocument } from "../lib/pdfUtils";

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const { employees, companies, roles, sectors, ppes, ppeDeliveries } =
    useAppContext();

  const employee = employees.find((e) => e.id === id);

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Colaborador não encontrado
        </h2>
        <p className="text-slate-500 mt-2 mb-6">
          O registro que você está procurando não existe ou foi removido.
        </p>
        <Link
          to="/colaboradores"
          className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 h-10 px-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para lista
        </Link>
      </div>
    );
  }

  const company = companies.find((c) => c.id === employee.companyId);
  const role = roles.find((r) => r.id === employee.roleId);
  const sector = sectors.find((s) => s.id === role?.sectorId);

  const employeeDeliveries = ppeDeliveries
    .filter((d) => d.employeeId === employee.id)
    .sort(
      (a, b) =>
        new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime(),
    );

  const generateFullHistoryPDF = () => {
    void (async () => {
      if (!company) return;

      const { doc, autoTable } = await createPdfDocument();

      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("Ficha Completa de Entrega de EPI", 105, 20, {
        align: "center",
      });

      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(`Empresa: ${company.name}`, 14, 40);
      doc.text(`CNPJ: ${company.cnpj}`, 14, 48);

      doc.text(`Colaborador: ${employee.name}`, 14, 60);
      doc.text(`CPF: ${employee.cpf}`, 14, 68);
      doc.text(
        `Cargo: ${role?.name || "N/A"} - Setor: ${sector?.name || "N/A"}`,
        14,
        76,
      );
      doc.text(
        `Data de Admissão: ${new Date(employee.admissionDate).toLocaleDateString("pt-BR")}`,
        14,
        84,
      );

      const tableData = employeeDeliveries.map((delivery) => {
        const ppe = ppes.find((p) => p.id === delivery.ppeId);
        return [
          ppe?.name || "Desconhecido",
          ppe?.ca || "-",
          delivery.quantity.toString(),
          new Date(delivery.deliveryDate).toLocaleDateString("pt-BR"),
          delivery.reason,
          delivery.status === "delivered"
            ? "Entregue"
            : delivery.status === "returned"
              ? "Devolvido"
              : "Extraviado",
        ];
      });

      autoTable(doc, {
        startY: 95,
        head: [["EPI", "CA", "Qtd", "Data", "Motivo", "Status"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 5 },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 120;
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const declarationText = `Declaro ter recebido da empresa ${company.name} os Equipamentos de Proteção Individual (EPI) constantes nesta ficha, comprometendo-me a usá-los apenas para a finalidade a que se destinam, responsabilizando-me por sua guarda e conservação, e a comunicar qualquer alteração que os torne impróprios para uso.`;

      const splitText = doc.splitTextToSize(declarationText, 180);
      doc.text(splitText, 14, finalY + 20);

      doc.setDrawColor(203, 213, 225);
      doc.line(40, finalY + 70, 170, finalY + 70);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Assinatura do Colaborador: ${employee.name}`,
        105,
        finalY + 78,
        {
          align: "center",
        },
      );

      doc.save(`Historico_EPI_${employee.name.replace(/\s+/g, "_")}.pdf`);
    })();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/colaboradores"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 shadow-sm rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Perfil do Colaborador
            </h1>
            <p className="text-slate-500 mt-1">
              Detalhes e histórico completo.
            </p>
          </div>
        </div>
        <button
          onClick={generateFullHistoryPDF}
          disabled={employeeDeliveries.length === 0}
          className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar Ficha Completa (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden lg:col-span-1">
          <div className="p-8">
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="w-28 h-28 bg-linear-to-br from-blue-50 to-blue-100 border-4 border-white shadow-md rounded-full flex items-center justify-center text-blue-600 mb-4">
                <User className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
                {employee.name}
              </h2>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                  employee.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-red-50 text-red-700 border-red-100"
                }`}
              >
                {employee.status === "active" ? "ATIVO" : "DEMITIDO"}
              </span>
            </div>

            {employee.status === "inactive" && (
              <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 text-sm">
                <p className="font-semibold text-red-800">
                  Colaborador demitido
                  {employee.dismissalDate
                    ? ` em ${new Date(employee.dismissalDate).toLocaleDateString("pt-BR")}`
                    : ""}
                </p>
                {employee.dismissalNotes && (
                  <p className="mt-1 text-slate-600">
                    {employee.dismissalNotes}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Empresa
                  </p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    {company?.name || "Não definida"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Cargo / Setor
                  </p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    {role?.name || "Não definido"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {sector?.name || "Não definido"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Documentos
                  </p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    CPF: {employee.cpf}
                  </p>
                  {employee.rg ? (
                    <p className="text-sm text-slate-500">RG: {employee.rg}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Datas
                  </p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    Nasc:{" "}
                    {new Date(employee.birthDate).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-sm text-slate-500">
                    Adm:{" "}
                    {new Date(employee.admissionDate).toLocaleDateString(
                      "pt-BR",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PPE History */}
        <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden lg:col-span-2 flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">
              Histórico de EPIs
            </h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">EPI</th>
                  <th className="px-6 py-4">CA</th>
                  <th className="px-6 py-4">Qtd</th>
                  <th className="px-6 py-4">Motivo</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeDeliveries.map((delivery) => {
                  const ppe = ppes.find((p) => p.id === delivery.ppeId);
                  return (
                    <tr
                      key={delivery.id}
                      className="bg-white hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {new Date(delivery.deliveryDate).toLocaleDateString(
                          "pt-BR",
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {ppe?.name || "Não encontrado"}
                      </td>
                      <td className="px-6 py-4">{ppe?.ca || "-"}</td>
                      <td className="px-6 py-4">{delivery.quantity}</td>
                      <td className="px-6 py-4">{delivery.reason}</td>
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
                          {delivery.status === "delivered"
                            ? "Entregue"
                            : delivery.status === "returned"
                              ? "Devolvido"
                              : "Extraviado"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {employeeDeliveries.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <ShieldCheck className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-base font-medium text-slate-900">
                          Nenhum histórico encontrado
                        </p>
                        <p className="text-sm">
                          Este colaborador ainda não recebeu nenhum EPI.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

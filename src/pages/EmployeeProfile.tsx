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
import {
  buildTableOptions,
  createBrandedPdf,
  drawHighlights,
  drawInfoCards,
  drawIntro,
  drawNoteBox,
  drawSectionTitle,
  ensureSpace,
  formatPdfDate,
  getLastTableBottom,
  savePdf,
  PDF_COLORS,
} from "../lib/pdfUtils";
import { formatDate } from "../lib/dates";

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

      try {
        const totalUnits = employeeDeliveries.reduce(
          (total, delivery) => total + delivery.quantity,
          0,
        );
        const activeItems = employeeDeliveries.filter(
          (delivery) => delivery.status === "delivered",
        ).length;
        const lastDelivery = employeeDeliveries[0];

        const ctx = await createBrandedPdf({
          title: "Ficha completa de EPIs",
          tag: "Histórico do colaborador",
          footerNote: `Histórico de EPIs · ${employee.name} · CPF ${employee.cpf}`,
        });

        let cursorY = drawIntro(ctx, {
          eyebrow: "Saúde e segurança do trabalho",
          heading: "Ficha completa de entrega de EPIs",
          description:
            "Consolidado de todos os equipamentos de proteção individual entregues ao colaborador, com quantidades, motivos e situação atual de cada item.",
        });

        cursorY = drawInfoCards(ctx, cursorY, [
          {
            title: "Empresa",
            fields: [
              { label: "Razão social / Nome", value: company.name },
              { label: "CNPJ / CPF", value: company.cnpj },
            ],
          },
          {
            title: "Colaborador",
            fields: [
              { label: "Nome", value: employee.name },
              { label: "CPF", value: employee.cpf },
              {
                label: "Cargo / Setor",
                value: `${role?.name ?? "Não definido"} · ${sector?.name ?? "Setor não definido"}`,
              },
              {
                label: "Admissão",
                value: formatPdfDate(employee.admissionDate),
              },
            ],
          },
        ]);

        cursorY = drawHighlights(ctx, cursorY, [
          { label: "Entregas", value: String(employeeDeliveries.length) },
          { label: "Unidades", value: String(totalUnits) },
          { label: "Em uso", value: String(activeItems) },
          {
            label: "Última entrega",
            value: lastDelivery
              ? formatPdfDate(lastDelivery.deliveryDate)
              : "—",
          },
        ]);

        cursorY = drawSectionTitle(
          ctx,
          cursorY + 2,
          "Histórico de entregas",
          "Registros ordenados da entrega mais recente para a mais antiga.",
        );

        ctx.autoTable(
          ctx.doc,
          buildTableOptions(ctx, {
            startY: cursorY + 4,
            head: [["Data", "EPI", "CA", "Qtd", "Motivo", "Situação"]],
            body: employeeDeliveries.map((delivery) => {
              const ppe = ppes.find((p) => p.id === delivery.ppeId);

              return [
                formatPdfDate(delivery.deliveryDate),
                ppe?.name || "Não encontrado",
                ppe?.ca || "—",
                delivery.quantity.toString(),
                delivery.reason,
                delivery.status === "delivered"
                  ? "Entregue"
                  : delivery.status === "returned"
                    ? "Devolvido"
                    : "Extraviado",
              ];
            }),
            columnStyles: {
              0: { cellWidth: 24 },
              2: { halign: "center", cellWidth: 20 },
              3: { halign: "center", cellWidth: 14 },
            },
          }),
        );

        cursorY = getLastTableBottom(ctx, cursorY) + 8;
        cursorY = ensureSpace(ctx, cursorY, 40);
        cursorY = drawNoteBox(ctx, cursorY, {
          title: "Termo de responsabilidade",
          text: `Declaro ter recebido da empresa ${company.name} os Equipamentos de Proteção Individual (EPI) constantes nesta ficha, comprometendo-me a usá-los apenas para a finalidade a que se destinam, responsabilizando-me por sua guarda e conservação, e a comunicar qualquer alteração que os tornem impróprios para uso.`,
        });

        cursorY = ensureSpace(ctx, cursorY + 12, 22);

        const lineWidth = 90;
        const lineX = (ctx.pageWidth - lineWidth) / 2;

        ctx.doc.setDrawColor(...PDF_COLORS.mutedSoft);
        ctx.doc.setLineWidth(0.3);
        ctx.doc.line(lineX, cursorY, lineX + lineWidth, cursorY);

        ctx.doc.setFont("helvetica", "bold");
        ctx.doc.setFontSize(8.6);
        ctx.doc.setTextColor(...PDF_COLORS.text);
        ctx.doc.text(employee.name, ctx.pageWidth / 2, cursorY + 5, {
          align: "center",
        });

        ctx.doc.setFont("helvetica", "normal");
        ctx.doc.setFontSize(7.4);
        ctx.doc.setTextColor(...PDF_COLORS.mutedSoft);
        ctx.doc.text(
          "Assinatura do colaborador",
          ctx.pageWidth / 2,
          cursorY + 9.5,
          { align: "center" },
        );

        savePdf(ctx, `Historico_EPI_${employee.name.replace(/\s+/g, "_")}.pdf`);
      } catch (error) {
        console.error("[EXIN SST] Falha ao gerar a ficha completa.", error);
        window.alert(
          "Não foi possível gerar a ficha completa agora. Tente novamente em instantes.",
        );
      }
    })();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/colaboradores"
            className="p-2 text-white/75 hover:text-white hover:bg-white/15 border border-transparent hover:border-white/25 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Perfil do Colaborador
            </h1>
            <p className="mt-1">
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
                    ? ` em ${formatDate(employee.dismissalDate)}`
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
                    Nasc: {formatDate(employee.birthDate)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Adm: {formatDate(employee.admissionDate)}
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
                        {formatDate(delivery.deliveryDate)}
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

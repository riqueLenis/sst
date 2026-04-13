import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  HardHat,
  PenLine,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAppContext } from "../store/AppContext";
import {
  formatPPEDeliverySignedAt,
  generatePPEDeliveryPdf,
} from "../lib/ppeDeliveryPdf";

function getDeliveryStatusLabel(status: "delivered" | "returned" | "lost") {
  if (status === "delivered") {
    return "Entregue";
  }

  if (status === "returned") {
    return "Devolvido";
  }

  return "Extraviado";
}

function getDeliveryStatusClass(status: "delivered" | "returned" | "lost") {
  if (status === "delivered") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (status === "returned") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  return "bg-red-50 text-red-700 border-red-100";
}

export default function PPEDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const { ppeDeliveries, employees, ppes, companies } = useAppContext();

  const delivery = ppeDeliveries.find((item) => item.id === id);
  const employee = employees.find((item) => item.id === delivery?.employeeId);
  const ppe = ppes.find((item) => item.id === delivery?.ppeId);
  const company = companies.find((item) => item.id === employee?.companyId);

  if (!delivery || !employee || !ppe || !company) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <ShieldCheck className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Entrega não encontrada
        </h2>
        <p className="mb-6 mt-2 text-center text-slate-500">
          O registro solicitado não existe mais ou não possui dados suficientes
          para exibição.
        </p>
        <Link
          to="/entregas"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-all duration-200 hover:bg-blue-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para entregas
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="page-hero">
        <div className="hero-card">
          <span className="hero-accent">Detalhe da entrega</span>
          <h1 className="hero-title">Assinatura e conferência da entrega de EPI</h1>
          <p className="hero-description">
            Registro completo da entrega realizada para {employee.name}, com
            visualização da assinatura digital capturada, dados do equipamento e
            informações operacionais do comprovante.
          </p>

          <div className="hero-actions">
            <Link to="/entregas" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              Voltar para entregas
            </Link>
            <button
              type="button"
              onClick={() =>
                void generatePPEDeliveryPdf({ delivery, employee, ppe, company })
              }
              className="btn-primary"
            >
              <Download className="h-4 w-4" />
              Baixar ficha (PDF)
            </button>
          </div>
        </div>

        <aside className="hero-aside">
          <div>
            <p className="eyebrow">Resumo do registro</p>
            <h2 className="panel-title">Situação e autenticação</h2>
            <p className="panel-copy">
              Estado da entrega, status da assinatura e momento de captura para
              rastreabilidade do comprovante.
            </p>
          </div>

          <div className="hero-stat-list">
            <div className="hero-stat">
              <div>
                <p className="hero-stat-label">Status</p>
                <p className="hero-stat-value text-2xl">
                  {getDeliveryStatusLabel(delivery.status)}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getDeliveryStatusClass(
                  delivery.status,
                )}`}
              >
                Registro ativo
              </span>
            </div>

            <div className="hero-stat">
              <div>
                <p className="hero-stat-label">Assinatura</p>
                <p className="hero-stat-value text-2xl">
                  {delivery.employeeSignature ? "Digital" : "Não disponível"}
                </p>
              </div>
              <p className="hero-stat-copy">
                {delivery.signedAt
                  ? `Capturada em ${formatPPEDeliverySignedAt(delivery.signedAt)}.`
                  : "Registro legado sem assinatura digital vinculada."}
              </p>
            </div>

            <div className="hero-stat">
              <div>
                <p className="hero-stat-label">Quantidade entregue</p>
                <p className="hero-stat-value text-2xl">{delivery.quantity}</p>
              </div>
              <p className="hero-stat-copy">Motivo informado: {delivery.reason}.</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Dados da entrega</p>
              <h2 className="panel-title">Informações operacionais</h2>
              <p className="panel-copy">
                Dados principais do colaborador, empresa e equipamento vinculados
                a este comprovante.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
              <div className="mb-3 flex items-center gap-3 text-slate-900">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Colaborador
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {employee.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-800">CPF:</span> {employee.cpf}</p>
                <p>
                  <span className="font-semibold text-slate-800">Admissão:</span>{" "}
                  {new Date(employee.admissionDate).toLocaleDateString("pt-BR")}
                </p>
                <Link
                  to={`/colaboradores/${employee.id}`}
                  className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Ver perfil do colaborador
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
              <div className="mb-3 flex items-center gap-3 text-slate-900">
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Empresa
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {company.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-800">CNPJ:</span> {company.cnpj}</p>
                <p><span className="font-semibold text-slate-800">Contato:</span> {company.contact}</p>
                <p><span className="font-semibold text-slate-800">Endereço:</span> {company.address}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
              <div className="mb-3 flex items-center gap-3 text-slate-900">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <HardHat className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Equipamento
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {ppe.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-800">CA:</span> {ppe.ca}</p>
                <p><span className="font-semibold text-slate-800">Quantidade:</span> {delivery.quantity}</p>
                <p><span className="font-semibold text-slate-800">Motivo:</span> {delivery.reason}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
              <div className="mb-3 flex items-center gap-3 text-slate-900">
                <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Datas do registro
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    Linha do tempo da entrega
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Entrega:</span>{" "}
                  {new Date(delivery.deliveryDate).toLocaleDateString("pt-BR")}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Assinatura:</span>{" "}
                  {delivery.signedAt
                    ? formatPPEDeliverySignedAt(delivery.signedAt)
                    : "Não registrada"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Devolução:</span>{" "}
                  {delivery.returnDate
                    ? new Date(delivery.returnDate).toLocaleDateString("pt-BR")
                    : "Ainda não devolvido"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Assinatura digital</p>
              <h2 className="panel-title">Comprovante visual da assinatura</h2>
              <p className="panel-copy">
                Imagem capturada no ato da entrega para conferência rápida do
                aceite pelo colaborador.
              </p>
            </div>
          </div>

          {delivery.employeeSignature ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <PenLine className="h-4 w-4 text-blue-600" />
                  Assinatura de {employee.name}
                </div>
                <div className="flex min-h-52 items-center justify-center rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] p-3">
                  <img
                    src={delivery.employeeSignature}
                    alt={`Assinatura digital de ${employee.name}`}
                    className="max-h-44 w-full object-contain"
                  />
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-800">
                <p className="font-semibold">Assinatura digital validada no registro</p>
                <p className="mt-1">
                  Captura realizada em {formatPPEDeliverySignedAt(delivery.signedAt ?? delivery.deliveryDate)}.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-amber-100 bg-amber-50/80 p-5 text-sm text-amber-800">
              <p className="font-semibold">Assinatura não disponível</p>
              <p className="mt-1">
                Este registro é anterior à obrigatoriedade de assinatura digital
                ou não possui imagem vinculada.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
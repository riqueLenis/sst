import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Download,
  Eye,
  PackageCheck,
  Search,
  Undo2,
} from "lucide-react";
import { useAppContext } from "../store/AppContext";
import { exportTableToPDF } from "../lib/pdfUtils";
import { formatDate, formatDateTime, toLocalDate } from "../lib/dates";

const formatReturnTime = (value?: string) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Returns() {
  const { ppeDeliveries, employees, ppes, companies, roles } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");

  // Histórico de devoluções: entregas que voltaram ao estoque.
  const returns = useMemo(() => {
    return ppeDeliveries
      .filter((delivery) => delivery.status === "returned")
      .map((delivery) => {
        const employee = employees.find(
          (item) => item.id === delivery.employeeId,
        );
        const ppe = ppes.find((item) => item.id === delivery.ppeId);
        const company = companies.find(
          (item) => item.id === employee?.companyId,
        );
        const role = roles.find((item) => item.id === employee?.roleId);

        return {
          delivery,
          employeeName: employee?.name ?? "Colaborador não encontrado",
          employeeCpf: employee?.cpf ?? "—",
          employeeId: employee?.id,
          companyName: company?.name ?? "Não definida",
          roleName: role?.name ?? "Não definido",
          ppeName: ppe?.name ?? "EPI não encontrado",
          ppeCa: ppe?.ca ?? "—",
          returnReason: delivery.returnReason ?? "Não informado",
          returnDate: delivery.returnedAt ?? delivery.returnDate,
        };
      })
      .sort((left, right) => {
        const leftTime =
          toLocalDate(left.returnDate ?? left.delivery.deliveryDate)?.getTime() ??
          0;
        const rightTime =
          toLocalDate(
            right.returnDate ?? right.delivery.deliveryDate,
          )?.getTime() ?? 0;

        return rightTime - leftTime;
      });
  }, [companies, employees, ppeDeliveries, ppes, roles]);

  const filteredReturns = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return returns;
    }

    return returns.filter((item) =>
      [
        item.employeeName,
        item.employeeCpf,
        item.ppeName,
        item.ppeCa,
        item.returnReason,
        item.companyName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [returns, searchTerm]);

  const totalUnits = filteredReturns.reduce(
    (total, item) => total + item.delivery.quantity,
    0,
  );
  const uniqueEmployees = new Set(
    filteredReturns.map((item) => item.employeeName),
  ).size;
  const lastReturn = filteredReturns[0];

  const handleExportPDF = () => {
    const columns = [
      "Colaborador",
      "CPF",
      "Empresa",
      "EPI",
      "CA",
      "Qtd",
      "Data",
      "Hora",
      "Motivo da devolução",
    ];
    const data = filteredReturns.map((item) => [
      item.employeeName,
      item.employeeCpf,
      item.companyName,
      item.ppeName,
      item.ppeCa,
      item.delivery.quantity.toString(),
      formatDate(item.returnDate),
      formatReturnTime(item.delivery.returnedAt),
      item.returnReason,
    ]);

    exportTableToPDF(
      "Histórico de Devoluções de EPI",
      columns,
      data,
      "devolucoes_epis_sst_pro",
      {
        tag: "Controle de EPI · NR-06",
        description:
          "Histórico completo das devoluções de equipamentos de proteção individual, com colaborador, data, hora e motivo informado no registro.",
        highlights: [
          { label: "Devoluções", value: String(filteredReturns.length) },
          { label: "Unidades", value: String(totalUnits) },
          { label: "Colaboradores", value: String(uniqueEmployees) },
          {
            label: "Última devolução",
            value: lastReturn ? formatDate(lastReturn.returnDate) : "—",
          },
        ],
      },
    );
  };

  const summaryStats = [
    {
      label: "Devoluções",
      value: filteredReturns.length,
      copy: "Registros de EPIs devolvidos e reincorporados ao estoque.",
    },
    {
      label: "Unidades devolvidas",
      value: totalUnits,
      copy: "Total de itens que voltaram para o estoque nas devoluções listadas.",
    },
    {
      label: "Colaboradores",
      value: uniqueEmployees,
      copy: "Pessoas com pelo menos uma devolução registrada.",
    },
  ];

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="page-hero">
        <div className="hero-card">
          <span className="hero-accent">Controle de EPI</span>
          <h1 className="hero-title">
            Histórico completo das devoluções de EPI.
          </h1>
          <p className="hero-description">
            Consulte quem devolveu, quando devolveu e por qual motivo, com
            exportação em PDF para auditoria.
          </p>

          <div className="hero-actions">
            <button
              onClick={handleExportPDF}
              disabled={filteredReturns.length === 0}
              className="btn-primary disabled:pointer-events-none disabled:opacity-50"
              type="button"
            >
              <Download className="h-4 w-4" />
              Exportar histórico (PDF)
            </button>
            <Link to="/entregas" className="btn-secondary">
              Ir para entregas
            </Link>
          </div>
        </div>

        <aside className="hero-aside">
          <div>
            <p className="eyebrow">Leitura operacional</p>
            <h2 className="panel-title">Resumo das devoluções</h2>
            <p className="panel-copy">
              Indicadores calculados sobre os registros visíveis na busca atual.
            </p>
          </div>

          <div className="hero-stat-list">
            {summaryStats.map((item) => (
              <div key={item.label} className="hero-stat">
                <div>
                  <p className="hero-stat-label">{item.label}</p>
                  <p className="hero-stat-value">{item.value}</p>
                </div>
                <p className="hero-stat-copy">{item.copy}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Auditoria de devoluções</p>
            <h2 className="panel-title">Todas as devoluções registradas</h2>
            <p className="panel-copy">
              A devolução é registrada na tela de Entregas de EPI e aparece aqui
              com data, hora e motivo informados no momento da confirmação.
            </p>
          </div>

          <div className="toolbar-actions">
            <button
              onClick={handleExportPDF}
              disabled={filteredReturns.length === 0}
              className="btn-secondary disabled:pointer-events-none disabled:opacity-50"
              type="button"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="search-shell">
            <Search className="h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por colaborador, EPI, CA ou motivo..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="search-input"
            />
          </div>

          <p className="text-sm text-slate-500">
            {filteredReturns.length} devolução(ões) visível(is)
          </p>
        </div>

        <div className="mobile-list mt-6 lg:hidden">
          {filteredReturns.map((item) => (
            <article key={item.delivery.id} className="mobile-record">
              <div className="mobile-record-header">
                <div>
                  <p className="mobile-record-title">{item.employeeName}</p>
                  <p className="mobile-record-copy">CPF {item.employeeCpf}</p>
                </div>

                <span className="status-pill border border-emerald-100 bg-emerald-50 text-emerald-700">
                  Devolvido
                </span>
              </div>

              <div className="mobile-record-grid">
                <div>
                  <p className="mobile-record-label">EPI</p>
                  <p className="mobile-record-value">
                    {item.ppeName} ({item.delivery.quantity} un)
                  </p>
                </div>
                <div>
                  <p className="mobile-record-label">CA</p>
                  <p className="mobile-record-value">{item.ppeCa}</p>
                </div>
                <div>
                  <p className="mobile-record-label">Data</p>
                  <p className="mobile-record-value">
                    {formatDate(item.returnDate)}
                  </p>
                </div>
                <div>
                  <p className="mobile-record-label">Hora</p>
                  <p className="mobile-record-value">
                    {formatReturnTime(item.delivery.returnedAt)}
                  </p>
                </div>
              </div>

              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold">Motivo:</span>{" "}
                {item.returnReason}
              </p>

              <div className="mobile-record-actions">
                <Link
                  to={`/entregas/${item.delivery.id}`}
                  className="icon-action icon-action-primary"
                  aria-label={`Ver detalhe da entrega de ${item.employeeName}`}
                >
                  <Eye className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}

          {filteredReturns.length === 0 && (
            <div className="empty-state rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70">
              <PackageCheck className="h-10 w-10 text-slate-300" />
              <p className="empty-state-title">Nenhuma devolução encontrada</p>
              <p className="empty-state-copy">
                As devoluções registradas na tela de Entregas de EPI aparecem
                aqui automaticamente.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto lg:block">
          <table className="min-w-240 w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Empresa / Cargo</th>
                <th className="px-6 py-4">EPI</th>
                <th className="px-6 py-4">Qtd</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4">Motivo da devolução</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.map((item) => (
                <tr
                  key={item.delivery.id}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-xs font-bold text-emerald-700">
                        <Undo2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {item.employeeName}
                        </p>
                        <p className="text-xs text-slate-500">
                          CPF {item.employeeCpf}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-700">
                      {item.companyName}
                    </p>
                    <p className="text-xs text-slate-500">{item.roleName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-700">{item.ppeName}</p>
                    <p className="text-xs text-slate-500">CA {item.ppeCa}</p>
                  </td>
                  <td className="px-6 py-4">{item.delivery.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(item.returnDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                      {formatReturnTime(item.delivery.returnedAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="max-w-72 text-slate-700">
                      {item.returnReason}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Entregue em {formatDate(item.delivery.deliveryDate)}
                      {item.delivery.returnedAt
                        ? ` • Registrado em ${formatDateTime(item.delivery.returnedAt)}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/entregas/${item.delivery.id}`}
                        className="icon-action icon-action-primary"
                        title="Ver detalhe da entrega"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-14">
                    <div className="empty-state">
                      <PackageCheck className="h-12 w-12 text-slate-300" />
                      <p className="empty-state-title">
                        Nenhuma devolução encontrada
                      </p>
                      <p className="empty-state-copy">
                        Registre a devolução em Entregas de EPI para alimentar
                        este histórico.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

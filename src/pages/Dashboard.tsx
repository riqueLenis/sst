import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  DollarSign,
  FileSignature,
  HardHat,
  ShieldAlert,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppContext } from "../store/AppContext";

export default function Dashboard() {
  const {
    companies,
    employees,
    ppes,
    ppeDeliveries,
    transactions,
    documents,
    asos,
  } = useAppContext();

  const activeEmployees = employees.filter(
    (employee) => employee.status === "active",
  ).length;
  const lowStockCount = ppes.filter((ppe) => ppe.stockQuantity < 20).length;
  const expiredProgramsCount = documents.filter(
    (document) =>
      document.status === "expired" ||
      new Date(document.validUntil) < new Date(),
  ).length;
  const expiredAsosCount = asos.filter(
    (aso) => new Date(aso.validUntil) < new Date(),
  ).length;
  const pendingTransactionsCount = transactions.filter(
    (transaction) => transaction.status === "pending",
  ).length;
  const deliveriesThisMonth = ppeDeliveries.filter((delivery) => {
    const deliveryDate = new Date(delivery.deliveryDate);
    const now = new Date();
    return (
      deliveryDate.getMonth() === now.getMonth() &&
      deliveryDate.getFullYear() === now.getFullYear()
    );
  }).length;

  const stats = [
    {
      name: "Empresas",
      value: companies.length,
      icon: Building2,
      color: "from-sky-500 to-cyan-500",
      link: "/empresas",
      support: "Base cadastrada para operação e atendimento.",
    },
    {
      name: "Colaboradores ativos",
      value: activeEmployees,
      icon: Users,
      color: "from-emerald-500 to-teal-500",
      link: "/colaboradores",
      support: "Equipe em atividade com vínculo monitorado.",
    },
    {
      name: "EPIs com atenção",
      value: lowStockCount,
      icon: HardHat,
      color: "from-amber-500 to-orange-500",
      link: "/epis",
      support: "Itens com estoque baixo ou próximos de ruptura.",
    },
    {
      name: "Entregas no mês",
      value: deliveriesThisMonth,
      icon: ShieldAlert,
      color: "from-indigo-500 to-sky-500",
      link: "/entregas",
      support: "Movimentações recentes de EPIs no período atual.",
    },
    {
      name: "Financeiro pendente",
      value: pendingTransactionsCount,
      icon: DollarSign,
      color: "from-rose-500 to-orange-500",
      link: "/financeiro",
      support: "Transações aguardando baixa ou recebimento.",
    },
    {
      name: "Programas vencidos",
      value: expiredProgramsCount,
      icon: FileSignature,
      color: "from-violet-500 to-fuchsia-500",
      link: "/programas",
      support: "Documentos com vigência encerrada ou expirada.",
    },
    {
      name: "ASOs vencidos",
      value: expiredAsosCount,
      icon: Stethoscope,
      color: "from-cyan-500 to-blue-500",
      link: "/saude",
      support: "Exames que já precisam de ação ou renovação.",
    },
  ];

  const employeesByCompany = companies
    .map((company) => ({
      name:
        company.name.length > 16
          ? `${company.name.slice(0, 16)}...`
          : company.name,
      Colaboradores: employees.filter(
        (employee) =>
          employee.companyId === company.id && employee.status === "active",
      ).length,
    }))
    .filter((item) => item.Colaboradores > 0)
    .slice(0, 6);

  const ppeStockData = [
    {
      name: "Estoque alto",
      value: ppes.filter((ppe) => ppe.stockQuantity > 50).length,
    },
    {
      name: "Estoque médio",
      value: ppes.filter(
        (ppe) => ppe.stockQuantity >= 20 && ppe.stockQuantity <= 50,
      ).length,
    },
    {
      name: "Estoque baixo",
      value: ppes.filter((ppe) => ppe.stockQuantity < 20).length,
    },
  ];

  const stockColors = ["#10b981", "#f59e0b", "#ef4444"];
  const radarStats = [
    {
      label: "Pontos de atenção",
      value: lowStockCount + expiredProgramsCount + expiredAsosCount,
      copy: "Pendências combinadas entre estoque, documentos e ASOs.",
    },
    {
      label: "Entregas no período",
      value: deliveriesThisMonth,
      copy: "Movimentações de EPIs registradas neste mês.",
    },
    {
      label: "Recebimentos pendentes",
      value: pendingTransactionsCount,
      copy: "Itens financeiros que ainda exigem ação.",
    },
  ];

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="page-hero">
        <div className="hero-card">
          <span className="hero-accent">Painel executivo</span>
          <h1 className="hero-title">
            Uma visão operacional consistente, da diretoria ao celular.
          </h1>
          <p className="hero-description">
            Acompanhe empresas, colaboradores, EPIs, programas, saúde
            ocupacional e financeiro em um cockpit único desenhado para leitura
            rápida em desktop, tablet e mobile.
          </p>

          <div className="hero-actions">
            <Link to="/colaboradores" className="btn-primary">
              Revisar equipe
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/entregas" className="btn-secondary">
              Registrar entrega
            </Link>
            <Link to="/programas" className="btn-soft">
              Ver documentos críticos
            </Link>
          </div>
        </div>

        <aside className="hero-aside">
          <div>
            <p className="eyebrow">Radar do dia</p>
            <h2 className="panel-title">Foco operacional imediato</h2>
            <p className="panel-copy">
              Indicadores condensados para priorização rápida da rotina.
            </p>
          </div>

          <div className="hero-stat-list">
            {radarStats.map((item) => (
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

      <section className="metric-grid">
        {stats.map((stat) => (
          <Link to={stat.link} key={stat.name} className="metric-card group">
            <div className="metric-top">
              <div>
                <p className="metric-label">{stat.name}</p>
                <p className="metric-value">{stat.value}</p>
              </div>

              <div className={`metric-icon bg-linear-to-br ${stat.color}`}>
                <stat.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <p className="metric-support">{stat.support}</p>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Distribuição</p>
              <h2 className="panel-title">Colaboradores por empresa</h2>
              <p className="panel-copy">
                Leitura consolidada das empresas com maior volume de pessoas.
              </p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={employeesByCompany}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#dbe4ee"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid rgba(226, 232, 240, 0.85)",
                    boxShadow: "0 20px 40px -30px rgba(15, 23, 42, 0.35)",
                  }}
                />
                <Bar
                  dataKey="Colaboradores"
                  fill="#0f766e"
                  radius={[10, 10, 0, 0]}
                  barSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Estoque</p>
              <h2 className="panel-title">Status do estoque de EPIs</h2>
              <p className="panel-copy">
                Distribuição do inventário entre estoque alto, médio e crítico.
              </p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ppeStockData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={98}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ppeStockData.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={stockColors[index % stockColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid rgba(226, 232, 240, 0.85)",
                    boxShadow: "0 20px 40px -30px rgba(15, 23, 42, 0.35)",
                  }}
                />
                <Legend verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Últimas movimentações</p>
              <h2 className="panel-title">Últimas entregas de EPI</h2>
              <p className="panel-copy">
                Histórico recente para validação rápida das entregas realizadas.
              </p>
            </div>
            <Link to="/entregas" className="btn-secondary">
              Ver todas
            </Link>
          </div>

          <ul className="space-y-3">
            {ppeDeliveries
              .slice(-5)
              .reverse()
              .map((delivery) => {
                const employee = employees.find(
                  (currentEmployee) =>
                    currentEmployee.id === delivery.employeeId,
                );
                const ppe = ppes.find(
                  (currentPpe) => currentPpe.id === delivery.ppeId,
                );

                return (
                  <li
                    key={delivery.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sm font-bold text-sky-700">
                        {employee?.name.charAt(0) ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {employee?.name ?? "Colaborador não encontrado"}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {ppe?.name ?? "EPI desconhecido"} ({delivery.quantity}{" "}
                          un)
                        </p>
                      </div>
                    </div>

                    <span className="status-pill border border-emerald-100 bg-emerald-50 text-emerald-700">
                      {new Date(delivery.deliveryDate).toLocaleDateString(
                        "pt-BR",
                      )}
                    </span>
                  </li>
                );
              })}

            {ppeDeliveries.length === 0 && (
              <li className="empty-state rounded-2xl border border-dashed border-slate-200 bg-slate-50/70">
                <ShieldAlert className="h-10 w-10 text-slate-300" />
                <p className="empty-state-title">Nenhuma entrega registrada</p>
                <p className="empty-state-copy">
                  Assim que novas entregas forem lançadas, elas aparecem aqui.
                </p>
              </li>
            )}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Risco de ruptura</p>
              <h2 className="panel-title">EPIs com baixo estoque</h2>
              <p className="panel-copy">
                Itens que merecem reabastecimento ou ajuste de consumo.
              </p>
            </div>
            <Link to="/epis" className="btn-secondary">
              Gerenciar
            </Link>
          </div>

          <ul className="space-y-3">
            {ppes
              .filter((ppe) => ppe.stockQuantity < 20)
              .slice(0, 5)
              .map((ppe) => (
                <li
                  key={ppe.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <HardHat className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {ppe.name}
                      </p>
                      <p className="text-sm text-slate-500">CA: {ppe.ca}</p>
                    </div>
                  </div>

                  <span
                    className={
                      ppe.stockQuantity <= 5
                        ? "status-pill border border-red-100 bg-red-50 text-red-700"
                        : "status-pill border border-amber-100 bg-amber-50 text-amber-700"
                    }
                  >
                    {ppe.stockQuantity} em estoque
                  </span>
                </li>
              ))}

            {lowStockCount === 0 && (
              <li className="empty-state rounded-2xl border border-dashed border-slate-200 bg-slate-50/70">
                <HardHat className="h-10 w-10 text-slate-300" />
                <p className="empty-state-title">Estoque regularizado</p>
                <p className="empty-state-copy">
                  Nenhum EPI está abaixo do nível de atenção neste momento.
                </p>
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

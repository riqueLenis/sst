import React from "react";
import { useAppContext } from "../store/AppContext";
import {
  Users,
  Building2,
  HardHat,
  ShieldAlert,
  ArrowRight,
  DollarSign,
  FileSignature,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

  const stats = [
    {
      name: "Empresas",
      value: companies.length,
      icon: Building2,
      color: "from-blue-500 to-blue-600",
      link: "/empresas",
    },
    {
      name: "Colaboradores",
      value: employees.filter((e) => e.status === "active").length,
      icon: Users,
      color: "from-emerald-500 to-emerald-600",
      link: "/colaboradores",
    },
    {
      name: "Tipos de EPI",
      value: ppes.length,
      icon: HardHat,
      color: "from-amber-500 to-amber-600",
      link: "/epis",
    },
    {
      name: "Entregas de EPI",
      value: ppeDeliveries.length,
      icon: ShieldAlert,
      color: "from-purple-500 to-purple-600",
      link: "/entregas",
    },
    {
      name: "Transações",
      value: transactions.length,
      icon: DollarSign,
      color: "from-indigo-500 to-indigo-600",
      link: "/financeiro",
    },
    {
      name: "Programas",
      value: documents.length,
      icon: FileSignature,
      color: "from-rose-500 to-rose-600",
      link: "/programas",
    },
    {
      name: "ASOs",
      value: asos.length,
      icon: Stethoscope,
      color: "from-cyan-500 to-cyan-600",
      link: "/saude",
    },
  ];

  // Data for charts
  const employeesByCompany = companies
    .map((c) => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
      Colaboradores: employees.filter(
        (e) => e.companyId === c.id && e.status === "active",
      ).length,
    }))
    .filter((d) => d.Colaboradores > 0)
    .slice(0, 5);

  const ppeStockData = [
    {
      name: "Estoque Alto (>50)",
      value: ppes.filter((p) => p.stockQuantity > 50).length,
    },
    {
      name: "Estoque Médio (20-50)",
      value: ppes.filter((p) => p.stockQuantity >= 20 && p.stockQuantity <= 50)
        .length,
    },
    {
      name: "Estoque Baixo (<20)",
      value: ppes.filter((p) => p.stockQuantity < 20).length,
    },
  ];
  const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Visão geral do sistema de Saúde e Segurança do Trabalho.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {stats.map((stat) => (
          <Link
            to={stat.link}
            key={stat.name}
            className="group bg-white border border-slate-200 shadow-sm rounded-2xl p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col items-center text-center"
          >
            <div
              className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-sm text-white mb-3`}
            >
              <stat.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
              {stat.value}
            </p>
            <h3 className="text-xs font-medium text-slate-500">{stat.name}</h3>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Employees by Company */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Colaboradores por Empresa (Top 5)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={employeesByCompany}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
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
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="Colaboradores"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: PPE Stock Status */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Status do Estoque de EPIs
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ppeStockData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ppeStockData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Últimas Entregas */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Últimas Entregas de EPI
            </h2>
            <Link
              to="/entregas"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Ver todas
            </Link>
          </div>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-slate-100">
              {ppeDeliveries
                .slice(-5)
                .reverse()
                .map((delivery) => {
                  const employee = employees.find(
                    (e) => e.id === delivery.employeeId,
                  );
                  const ppe = ppes.find((p) => p.id === delivery.ppeId);
                  return (
                    <li
                      key={delivery.id}
                      className="py-4 hover:bg-slate-50 transition-colors rounded-lg px-2 -mx-2"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                          {employee?.name.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {employee?.name || "Desconhecido"}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
                            {ppe?.name || "EPI Desconhecido"} (
                            {delivery.quantity} un)
                          </p>
                        </div>
                        <div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {new Date(delivery.deliveryDate).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              {ppeDeliveries.length === 0 && (
                <li className="py-8 text-sm text-slate-500 text-center">
                  Nenhuma entrega registrada.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* EPIs Baixo Estoque */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              EPIs com Baixo Estoque
            </h2>
            <Link
              to="/epis"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Gerenciar
            </Link>
          </div>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-slate-100">
              {ppes
                .filter((p) => p.stockQuantity < 20)
                .map((ppe) => (
                  <li
                    key={ppe.id}
                    className="py-4 hover:bg-slate-50 transition-colors rounded-lg px-2 -mx-2"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <HardHat className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {ppe.name}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          CA: {ppe.ca}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            ppe.stockQuantity <= 5
                              ? "bg-red-50 text-red-700 border-red-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {ppe.stockQuantity} em estoque
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              {ppes.filter((p) => p.stockQuantity < 20).length === 0 && (
                <li className="py-8 text-sm text-slate-500 text-center">
                  Estoque regularizado.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { useAppContext } from "../store/AppContext";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Download,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { exportTableToPDF } from "../lib/pdfUtils";

export default function Financial() {
  const {
    transactions,
    companies,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<
    "transactions" | "billing" | "reports"
  >("transactions");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const initialFormState = {
    companyId: "",
    type: "income" as const,
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    description: "",
    status: "pending" as const,
    category: "Faturamento",
  };
  const [formData, setFormData] = useState(initialFormState);

  // Metrics
  const totalIncome = transactions
    .filter((t) => t.type === "income" && t.status === "paid")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense" && t.status === "paid")
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const pendingIncome = transactions
    .filter((t) => t.type === "income" && t.status === "pending")
    .reduce((acc, t) => acc + t.amount, 0);
  const pendingExpense = transactions
    .filter((t) => t.type === "expense" && t.status === "pending")
    .reduce((acc, t) => acc + t.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction(formData);
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    updateTransaction(id, {
      status: currentStatus === "pending" ? "paid" : "pending",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Transactions Tab
  const filteredTransactions = transactions
    .filter((t) => {
      const company = companies.find((c) => c.id === t.companyId);
      const searchLower = searchTerm.toLowerCase();
      return (
        t.description.toLowerCase().includes(searchLower) ||
        company?.name.toLowerCase().includes(searchLower) ||
        t.category.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExportTransactions = () => {
    const columns = [
      "Data",
      "Vencimento",
      "Empresa",
      "Descrição",
      "Categoria",
      "Tipo",
      "Valor",
      "Status",
    ];
    const data = filteredTransactions.map((t) => {
      const company = companies.find((c) => c.id === t.companyId);
      return [
        new Date(t.date).toLocaleDateString("pt-BR"),
        new Date(t.dueDate).toLocaleDateString("pt-BR"),
        company?.name || "N/A",
        t.description,
        t.category,
        t.type === "income" ? "Receita" : "Despesa",
        formatCurrency(t.amount),
        t.status === "paid" ? "Pago" : "Pendente",
      ];
    });
    exportTableToPDF(
      "Relatório de Transações",
      columns,
      data,
      "transacoes_sst_pro",
    );
  };

  // Billing Tab
  const billingByCompany = useMemo(() => {
    const billing: Record<
      string,
      {
        companyName: string;
        totalBilled: number;
        totalPaid: number;
        totalPending: number;
      }
    > = {};

    companies.forEach((c) => {
      billing[c.id] = {
        companyName: c.name,
        totalBilled: 0,
        totalPaid: 0,
        totalPending: 0,
      };
    });

    transactions
      .filter((t) => t.type === "income")
      .forEach((t) => {
        if (billing[t.companyId]) {
          billing[t.companyId].totalBilled += t.amount;
          if (t.status === "paid") billing[t.companyId].totalPaid += t.amount;
          if (t.status === "pending")
            billing[t.companyId].totalPending += t.amount;
        }
      });

    return Object.values(billing)
      .filter((b) => b.totalBilled > 0)
      .sort((a, b) => b.totalBilled - a.totalBilled);
  }, [transactions, companies]);

  const handleExportBilling = () => {
    const columns = [
      "Empresa",
      "Total Faturado",
      "Total Recebido",
      "Total Pendente",
    ];
    const data = billingByCompany.map((b) => [
      b.companyName,
      formatCurrency(b.totalBilled),
      formatCurrency(b.totalPaid),
      formatCurrency(b.totalPending),
    ]);
    exportTableToPDF(
      "Relatório de Faturamento por Empresa",
      columns,
      data,
      "faturamento_sst_pro",
    );
  };

  // Reports Tab (Cash Flow by Month)
  const cashFlowByMonth = useMemo(() => {
    const flow: Record<
      string,
      { month: string; income: number; expense: number; balance: number }
    > = {};

    transactions
      .filter((t) => t.status === "paid")
      .forEach((t) => {
        const date = new Date(t.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthName = date.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });

        if (!flow[monthYear]) {
          flow[monthYear] = {
            month: monthName,
            income: 0,
            expense: 0,
            balance: 0,
          };
        }

        if (t.type === "income") flow[monthYear].income += t.amount;
        if (t.type === "expense") flow[monthYear].expense += t.amount;
        flow[monthYear].balance =
          flow[monthYear].income - flow[monthYear].expense;
      });

    return Object.entries(flow)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map((entry) => entry[1]);
  }, [transactions]);

  const handleExportCashFlow = () => {
    const columns = ["Mês", "Receitas (Pagas)", "Despesas (Pagas)", "Saldo"];
    const data = cashFlowByMonth.map((c) => [
      c.month.charAt(0).toUpperCase() + c.month.slice(1),
      formatCurrency(c.income),
      formatCurrency(c.expense),
      formatCurrency(c.balance),
    ]);
    exportTableToPDF(
      "Relatório de Fluxo de Caixa",
      columns,
      data,
      "fluxo_caixa_sst_pro",
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            Financeiro
          </h1>
          <p className="text-slate-500 mt-1">
            Gestão de contas a pagar, receber e faturamento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({
                ...initialFormState,
                companyId: companies[0]?.id || "",
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200 h-10 px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 rounded-full text-emerald-600">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Receitas (Pagas)
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              +{formatCurrency(pendingIncome)} pendentes
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-red-50 rounded-full text-red-600">
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Despesas (Pagas)
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalExpense)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              +{formatCurrency(pendingExpense)} pendentes
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div
            className={`p-4 rounded-full ${balance >= 0 ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}
          >
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Saldo Atual</p>
            <p
              className={`text-2xl font-bold ${balance >= 0 ? "text-blue-600" : "text-orange-600"}`}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "transactions"
                ? "border-emerald-600 text-emerald-600 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Contas a Pagar/Receber
            </div>
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "billing"
                ? "border-emerald-600 text-emerald-600 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4" />
              Faturamento por Empresa
            </div>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "reports"
                ? "border-emerald-600 text-emerald-600 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Fluxo de Caixa
            </div>
          </button>
        </div>

        {/* Tab Content: Transactions */}
        {activeTab === "transactions" && (
          <div className="animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={handleExportTransactions}
                disabled={filteredTransactions.length === 0}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar (PDF)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Vencimento</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Empresa</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((t) => {
                    const company = companies.find((c) => c.id === t.companyId);
                    const isOverdue =
                      t.status === "pending" &&
                      new Date(t.dueDate) < new Date();

                    return (
                      <tr
                        key={t.id}
                        className="bg-white hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span
                            className={
                              isOverdue ? "text-red-600 font-semibold" : ""
                            }
                          >
                            {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {t.description}
                          </p>
                          <p className="text-xs text-slate-500">{t.category}</p>
                        </td>
                        <td className="px-6 py-4">{company?.name || "N/A"}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              t.type === "income"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {t.type === "income" ? "Receita" : "Despesa"}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-medium ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {t.type === "income" ? "+" : "-"}
                          {formatCurrency(t.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              t.status === "paid"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : isOverdue
                                  ? "bg-red-50 text-red-700 border-red-100"
                                  : "bg-orange-50 text-orange-700 border-orange-100"
                            }`}
                          >
                            {t.status === "paid"
                              ? "Pago"
                              : isOverdue
                                ? "Atrasado"
                                : "Pendente"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(t.id, t.status)}
                            className={`p-2 rounded-lg transition-colors ${
                              t.status === "paid"
                                ? "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={
                              t.status === "paid"
                                ? "Marcar como Pendente"
                                : "Marcar como Pago"
                            }
                          >
                            {t.status === "paid" ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <DollarSign className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-base font-medium text-slate-900">
                            Nenhuma transação encontrada
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Billing */}
        {activeTab === "billing" && (
          <div className="animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={handleExportBilling}
                disabled={billingByCompany.length === 0}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar (PDF)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Empresa (Cliente)</th>
                    <th className="px-6 py-4 text-right">Total Faturado</th>
                    <th className="px-6 py-4 text-right">Total Recebido</th>
                    <th className="px-6 py-4 text-right">Total Pendente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billingByCompany.map((b, i) => (
                    <tr
                      key={i}
                      className="bg-white hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {b.companyName}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {formatCurrency(b.totalBilled)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">
                        {formatCurrency(b.totalPaid)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-orange-600">
                        {formatCurrency(b.totalPending)}
                      </td>
                    </tr>
                  ))}
                  {billingByCompany.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        Nenhum faturamento registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Reports */}
        {activeTab === "reports" && (
          <div className="animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={handleExportCashFlow}
                disabled={cashFlowByMonth.length === 0}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar (PDF)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Mês</th>
                    <th className="px-6 py-4 text-right">Receitas (Pagas)</th>
                    <th className="px-6 py-4 text-right">Despesas (Pagas)</th>
                    <th className="px-6 py-4 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashFlowByMonth.map((c, i) => (
                    <tr
                      key={i}
                      className="bg-white hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 capitalize">
                        {c.month}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">
                        {formatCurrency(c.income)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-red-600">
                        {formatCurrency(c.expense)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${c.balance >= 0 ? "text-blue-600" : "text-orange-600"}`}
                      >
                        {formatCurrency(c.balance)}
                      </td>
                    </tr>
                  ))}
                  {cashFlowByMonth.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        Nenhum fluxo de caixa registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="my-6 bg-white rounded-2xl shadow-xl w-full max-h-[calc(100vh-2rem)] max-w-md overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <h3 className="text-lg font-bold text-slate-900">
                Nova Transação
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Tipo
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "income" | "expense",
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="income">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Empresa / Cliente / Fornecedor
                </label>
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) =>
                    setFormData({ ...formData, companyId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>
                    Selecione uma empresa
                  </option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Faturamento Mensal, Compra de EPI..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Categoria
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Treinamentos"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "pending" | "paid",
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    !formData.companyId ||
                    !formData.description ||
                    formData.amount <= 0
                  }
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 border border-transparent rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar Transação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

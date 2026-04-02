import React, { useState, useMemo } from "react";
import { useAppContext } from "../store/AppContext";
import {
  Stethoscope,
  Plus,
  Search,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  HeartPulse,
  CalendarDays,
} from "lucide-react";
import { exportTableToPDF } from "../lib/pdfUtils";

export default function OccupationalHealth() {
  const {
    employees,
    companies,
    asos,
    absences,
    referrals,
    addASO,
    addAbsence,
    addReferral,
    updateASO,
    updateAbsence,
    updateReferral,
    deleteASO,
    deleteAbsence,
    deleteReferral,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<
    "asos" | "absences" | "referrals" | "metrics"
  >("asos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form States
  const asoInitialState = {
    employeeId: "",
    type: "periodico" as const,
    date: new Date().toISOString().split("T")[0],
    validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString()
      .split("T")[0],
    result: "apto" as const,
    doctor: "",
    crm: "",
    notes: "",
  };

  const absenceInitialState = {
    employeeId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "doenca" as const,
    cid: "",
    doctor: "",
    status: "active" as const,
  };

  const referralInitialState = {
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    specialty: "",
    reason: "",
    status: "pending" as const,
  };

  const [asoData, setAsoData] = useState(asoInitialState);
  const [absenceData, setAbsenceData] = useState(absenceInitialState);
  const [referralData, setReferralData] = useState(referralInitialState);

  const handleOpenModal = () => {
    if (activeTab === "asos")
      setAsoData({ ...asoInitialState, employeeId: employees[0]?.id || "" });
    if (activeTab === "absences")
      setAbsenceData({
        ...absenceInitialState,
        employeeId: employees[0]?.id || "",
      });
    if (activeTab === "referrals")
      setReferralData({
        ...referralInitialState,
        employeeId: employees[0]?.id || "",
      });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "asos") {
      addASO(asoData);
      setAsoData(asoInitialState);
    } else if (activeTab === "absences") {
      addAbsence(absenceData);
      setAbsenceData(absenceInitialState);
    } else if (activeTab === "referrals") {
      addReferral(referralData);
      setReferralData(referralInitialState);
    }
    setIsModalOpen(false);
  };

  // --- ASO Tab ---
  const filteredASOs = asos
    .filter((a) => {
      const employee = employees.find((e) => e.id === a.employeeId);
      const searchLower = searchTerm.toLowerCase();
      return (
        employee?.name.toLowerCase().includes(searchLower) ||
        a.type.toLowerCase().includes(searchLower) ||
        a.doctor.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExportASOs = () => {
    const columns = [
      "Colaborador",
      "Tipo",
      "Data",
      "Validade",
      "Resultado",
      "Médico/CRM",
    ];
    const data = filteredASOs.map((a) => {
      const employee = employees.find((e) => e.id === a.employeeId);
      return [
        employee?.name || "N/A",
        a.type.charAt(0).toUpperCase() + a.type.slice(1),
        new Date(a.date).toLocaleDateString("pt-BR"),
        new Date(a.validUntil).toLocaleDateString("pt-BR"),
        a.result === "apto" ? "Apto" : "Inapto",
        `${a.doctor} (${a.crm})`,
      ];
    });
    exportTableToPDF("Relatório de ASOs", columns, data, "asos_sst_pro");
  };

  // --- Absences Tab ---
  const filteredAbsences = absences
    .filter((a) => {
      const employee = employees.find((e) => e.id === a.employeeId);
      const searchLower = searchTerm.toLowerCase();
      return (
        employee?.name.toLowerCase().includes(searchLower) ||
        a.reason.toLowerCase().includes(searchLower) ||
        a.cid.toLowerCase().includes(searchLower)
      );
    })
    .sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

  const handleExportAbsences = () => {
    const columns = ["Colaborador", "Motivo", "CID", "Início", "Fim", "Status"];
    const data = filteredAbsences.map((a) => {
      const employee = employees.find((e) => e.id === a.employeeId);
      const reasonMap = {
        doenca: "Doença",
        acidente_trabalho: "Acidente Trab.",
        maternidade: "Maternidade",
        outros: "Outros",
      };
      return [
        employee?.name || "N/A",
        reasonMap[a.reason],
        a.cid || "-",
        new Date(a.startDate).toLocaleDateString("pt-BR"),
        new Date(a.endDate).toLocaleDateString("pt-BR"),
        a.status === "active" ? "Ativo" : "Finalizado",
      ];
    });
    exportTableToPDF(
      "Relatório de Afastamentos",
      columns,
      data,
      "afastamentos_sst_pro",
    );
  };

  // --- Referrals Tab ---
  const filteredReferrals = referrals
    .filter((r) => {
      const employee = employees.find((e) => e.id === r.employeeId);
      const searchLower = searchTerm.toLowerCase();
      return (
        employee?.name.toLowerCase().includes(searchLower) ||
        r.specialty.toLowerCase().includes(searchLower) ||
        r.reason.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExportReferrals = () => {
    const columns = [
      "Data",
      "Colaborador",
      "Especialidade",
      "Motivo",
      "Status",
    ];
    const data = filteredReferrals.map((r) => {
      const employee = employees.find((e) => e.id === r.employeeId);
      return [
        new Date(r.date).toLocaleDateString("pt-BR"),
        employee?.name || "N/A",
        r.specialty,
        r.reason,
        r.status === "pending" ? "Pendente" : "Concluído",
      ];
    });
    exportTableToPDF(
      "Relatório de Encaminhamentos",
      columns,
      data,
      "encaminhamentos_sst_pro",
    );
  };

  // --- Metrics ---
  const activeAbsencesCount = absences.filter(
    (a) => a.status === "active",
  ).length;
  const expiredASOsCount = asos.filter(
    (a) => new Date(a.validUntil) < new Date(),
  ).length;
  const pendingReferralsCount = referrals.filter(
    (r) => r.status === "pending",
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl">
              <Stethoscope className="w-6 h-6 text-rose-600" />
            </div>
            Saúde Ocupacional
          </h1>
          <p className="text-slate-500 mt-1">
            Gestão de ASOs, afastamentos e encaminhamentos médicos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab !== "metrics" && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50 bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-200 h-10 px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-orange-50 rounded-full text-orange-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">ASOs Vencidos</p>
            <p className="text-2xl font-bold text-slate-900">
              {expiredASOsCount}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-rose-50 rounded-full text-rose-600">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Afastamentos Ativos
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {activeAbsencesCount}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-blue-50 rounded-full text-blue-600">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Encaminhamentos Pendentes
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {pendingReferralsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("asos")}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "asos"
                ? "border-rose-600 text-rose-600 bg-rose-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Controle de ASOs
            </div>
          </button>
          <button
            onClick={() => setActiveTab("absences")}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "absences"
                ? "border-rose-600 text-rose-600 bg-rose-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Afastamentos
            </div>
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "referrals"
                ? "border-rose-600 text-rose-600 bg-rose-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <HeartPulse className="w-4 h-4" />
              Encaminhamentos
            </div>
          </button>
        </div>

        {/* Tab Content: ASOs */}
        {activeTab === "asos" && (
          <div className="animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar ASOs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={handleExportASOs}
                disabled={filteredASOs.length === 0}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar (PDF)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Data / Validade</th>
                    <th className="px-6 py-4">Resultado</th>
                    <th className="px-6 py-4">Médico</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredASOs.map((a) => {
                    const employee = employees.find(
                      (e) => e.id === a.employeeId,
                    );
                    const isExpired = new Date(a.validUntil) < new Date();
                    return (
                      <tr
                        key={a.id}
                        className="bg-white hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {employee?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 capitalize">{a.type}</td>
                        <td className="px-6 py-4">
                          <p className="text-slate-900">
                            {new Date(a.date).toLocaleDateString("pt-BR")}
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${isExpired ? "text-red-600 font-semibold" : "text-slate-500"}`}
                          >
                            Vence:{" "}
                            {new Date(a.validUntil).toLocaleDateString("pt-BR")}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              a.result === "apto"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-red-50 text-red-700 border-red-100"
                            }`}
                          >
                            {a.result === "apto" ? "Apto" : "Inapto"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-900">{a.doctor}</p>
                          <p className="text-xs text-slate-500">CRM: {a.crm}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteASO(a.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredASOs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        Nenhum ASO encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Absences */}
        {activeTab === "absences" && (
          <div className="animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar afastamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={handleExportAbsences}
                disabled={filteredAbsences.length === 0}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar (PDF)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Motivo / CID</th>
                    <th className="px-6 py-4">Período</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAbsences.map((a) => {
                    const employee = employees.find(
                      (e) => e.id === a.employeeId,
                    );
                    const reasonMap = {
                      doenca: "Doença",
                      acidente_trabalho: "Acidente Trab.",
                      maternidade: "Maternidade",
                      outros: "Outros",
                    };
                    return (
                      <tr
                        key={a.id}
                        className="bg-white hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {employee?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-900">
                            {reasonMap[a.reason]}
                          </p>
                          {a.cid && (
                            <p className="text-xs text-slate-500">
                              CID: {a.cid}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-900">
                            {new Date(a.startDate).toLocaleDateString("pt-BR")}{" "}
                            até
                          </p>
                          <p className="text-slate-900">
                            {new Date(a.endDate).toLocaleDateString("pt-BR")}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              a.status === "active"
                                ? "bg-orange-50 text-orange-700 border-orange-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}
                          >
                            {a.status === "active" ? "Ativo" : "Finalizado"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                updateAbsence(a.id, {
                                  status:
                                    a.status === "active"
                                      ? "finished"
                                      : "active",
                                })
                              }
                              className={`p-2 rounded-lg transition-colors ${
                                a.status === "active"
                                  ? "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                  : "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                              }`}
                              title={
                                a.status === "active"
                                  ? "Marcar como Finalizado"
                                  : "Marcar como Ativo"
                              }
                            >
                              {a.status === "active" ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteAbsence(a.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAbsences.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        Nenhum afastamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Referrals */}
        {activeTab === "referrals" && (
          <div className="animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar encaminhamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={handleExportReferrals}
                disabled={filteredReferrals.length === 0}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar (PDF)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Especialidade / Motivo</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReferrals.map((r) => {
                    const employee = employees.find(
                      (e) => e.id === r.employeeId,
                    );
                    return (
                      <tr
                        key={r.id}
                        className="bg-white hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {new Date(r.date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {employee?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-900 font-medium">
                            {r.specialty}
                          </p>
                          <p className="text-xs text-slate-500">{r.reason}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              r.status === "pending"
                                ? "bg-orange-50 text-orange-700 border-orange-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}
                          >
                            {r.status === "pending" ? "Pendente" : "Concluído"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                updateReferral(r.id, {
                                  status:
                                    r.status === "pending"
                                      ? "completed"
                                      : "pending",
                                })
                              }
                              className={`p-2 rounded-lg transition-colors ${
                                r.status === "pending"
                                  ? "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                  : "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                              }`}
                              title={
                                r.status === "pending"
                                  ? "Marcar como Concluído"
                                  : "Marcar como Pendente"
                              }
                            >
                              {r.status === "pending" ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteReferral(r.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredReferrals.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        Nenhum encaminhamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="my-6 bg-white rounded-2xl shadow-xl w-full max-h-[calc(100vh-2rem)] max-w-md overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === "asos"
                  ? "Novo ASO"
                  : activeTab === "absences"
                    ? "Novo Afastamento"
                    : "Novo Encaminhamento"}
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
              {/* Common Field: Employee */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Colaborador
                </label>
                <select
                  required
                  value={
                    activeTab === "asos"
                      ? asoData.employeeId
                      : activeTab === "absences"
                        ? absenceData.employeeId
                        : referralData.employeeId
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeTab === "asos")
                      setAsoData({ ...asoData, employeeId: val });
                    if (activeTab === "absences")
                      setAbsenceData({ ...absenceData, employeeId: val });
                    if (activeTab === "referrals")
                      setReferralData({ ...referralData, employeeId: val });
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>
                    Selecione um colaborador
                  </option>
                  {employees
                    .filter((e) => e.status === "active")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* ASO Fields */}
              {activeTab === "asos" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Tipo de ASO
                      </label>
                      <select
                        required
                        value={asoData.type}
                        onChange={(e) =>
                          setAsoData({
                            ...asoData,
                            type: e.target.value as any,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                      >
                        <option value="admissional">Admissional</option>
                        <option value="demissional">Demissional</option>
                        <option value="periodico">Periódico</option>
                        <option value="retorno">Retorno ao Trabalho</option>
                        <option value="mudanca">Mudança de Risco</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Resultado
                      </label>
                      <select
                        required
                        value={asoData.result}
                        onChange={(e) =>
                          setAsoData({
                            ...asoData,
                            result: e.target.value as any,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                      >
                        <option value="apto">Apto</option>
                        <option value="inapto">Inapto</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Data do Exame
                      </label>
                      <input
                        type="date"
                        required
                        value={asoData.date}
                        onChange={(e) =>
                          setAsoData({ ...asoData, date: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Validade
                      </label>
                      <input
                        type="date"
                        required
                        value={asoData.validUntil}
                        onChange={(e) =>
                          setAsoData({ ...asoData, validUntil: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Médico
                      </label>
                      <input
                        type="text"
                        required
                        value={asoData.doctor}
                        onChange={(e) =>
                          setAsoData({ ...asoData, doctor: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        CRM
                      </label>
                      <input
                        type="text"
                        required
                        value={asoData.crm}
                        onChange={(e) =>
                          setAsoData({ ...asoData, crm: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Absence Fields */}
              {activeTab === "absences" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Motivo
                      </label>
                      <select
                        required
                        value={absenceData.reason}
                        onChange={(e) =>
                          setAbsenceData({
                            ...absenceData,
                            reason: e.target.value as any,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                      >
                        <option value="doenca">Doença</option>
                        <option value="acidente_trabalho">
                          Acidente de Trabalho
                        </option>
                        <option value="maternidade">Maternidade</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        CID (Opcional)
                      </label>
                      <input
                        type="text"
                        value={absenceData.cid}
                        onChange={(e) =>
                          setAbsenceData({
                            ...absenceData,
                            cid: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Data Início
                      </label>
                      <input
                        type="date"
                        required
                        value={absenceData.startDate}
                        onChange={(e) =>
                          setAbsenceData({
                            ...absenceData,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        required
                        value={absenceData.endDate}
                        onChange={(e) =>
                          setAbsenceData({
                            ...absenceData,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Médico / Observações
                    </label>
                    <input
                      type="text"
                      value={absenceData.doctor}
                      onChange={(e) =>
                        setAbsenceData({
                          ...absenceData,
                          doctor: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    />
                  </div>
                </>
              )}

              {/* Referral Fields */}
              {activeTab === "referrals" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Data
                      </label>
                      <input
                        type="date"
                        required
                        value={referralData.date}
                        onChange={(e) =>
                          setReferralData({
                            ...referralData,
                            date: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Especialidade
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Oftalmologia"
                        value={referralData.specialty}
                        onChange={(e) =>
                          setReferralData({
                            ...referralData,
                            specialty: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Motivo do Encaminhamento
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={referralData.reason}
                      onChange={(e) =>
                        setReferralData({
                          ...referralData,
                          reason: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                </>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 border border-transparent rounded-xl hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm shadow-rose-200 transition-all"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

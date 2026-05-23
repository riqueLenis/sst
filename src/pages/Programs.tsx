import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import {
  FileSignature,
  Plus,
  Search,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { exportTableToPDF } from "../lib/pdfUtils";

export default function Programs() {
  const { documents, companies, addDocument, updateDocument, deleteDocument } =
    useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const initialFormState = {
    companyId: "",
    type: "PGR" as const,
    title: "",
    issueDate: new Date().toISOString().split("T")[0],
    validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString()
      .split("T")[0],
    status: "active" as const,
    hasInsalubrity: false,
    hasPericulosity: false,
    notes: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addDocument(formData);
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    updateDocument(id, {
      status: currentStatus === "active" ? "expired" : "active",
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este documento?")) {
      deleteDocument(id);
    }
  };

  const filteredDocuments = documents
    .filter((d) => {
      const company = companies.find((c) => c.id === d.companyId);
      const searchLower = searchTerm.toLowerCase();
      return (
        d.title.toLowerCase().includes(searchLower) ||
        company?.name.toLowerCase().includes(searchLower) ||
        d.type.toLowerCase().includes(searchLower)
      );
    })
    .sort(
      (a, b) =>
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
    );

  const handleExportPDF = () => {
    const columns = [
      "Documento",
      "Tipo",
      "Empresa",
      "Emissão",
      "Validade",
      "Adicionais",
      "Status",
    ];
    const data = filteredDocuments.map((d) => {
      const company = companies.find((c) => c.id === d.companyId);
      const isExpired = new Date(d.validUntil) < new Date();

      let adicionais = [];
      if (d.hasInsalubrity) adicionais.push("Insalubridade");
      if (d.hasPericulosity) adicionais.push("Periculosidade");

      return [
        d.title,
        d.type,
        company?.name || "N/A",
        new Date(d.issueDate).toLocaleDateString("pt-BR"),
        new Date(d.validUntil).toLocaleDateString("pt-BR"),
        adicionais.length > 0 ? adicionais.join(", ") : "Nenhum",
        d.status === "active" && !isExpired
          ? "Ativo"
          : d.status === "draft"
            ? "Rascunho"
            : "Vencido",
      ];
    });
    exportTableToPDF(
      "Relatório de Programas e Laudos",
      columns,
      data,
      "programas_laudos_sst_pro",
    );
  };

  // Metrics
  const activeDocs = documents.filter(
    (d) => d.status === "active" && new Date(d.validUntil) >= new Date(),
  ).length;
  const expiredDocs = documents.filter(
    (d) => d.status === "expired" || new Date(d.validUntil) < new Date(),
  ).length;
  const docsWithAditionals = documents.filter(
    (d) => d.hasInsalubrity || d.hasPericulosity,
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <FileSignature className="w-6 h-6 text-indigo-600" />
            </div>
            Programas e Laudos
          </h1>
          <p className="text-slate-500 mt-1">
            Gestão de PGR, LTCAT e controle de adicionais.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={documents.length === 0}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Lista (PDF)
          </button>
          <button
            onClick={() => {
              setFormData({
                ...initialFormState,
                companyId: companies[0]?.id || "",
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 h-10 px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Documento
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 rounded-full text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Documentos Ativos
            </p>
            <p className="text-2xl font-bold text-slate-900">{activeDocs}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-red-50 rounded-full text-red-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Vencidos ou Expirados
            </p>
            <p className="text-2xl font-bold text-slate-900">{expiredDocs}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-orange-50 rounded-full text-orange-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Com Adicionais (Ins/Per)
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {docsWithAditionals}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título, empresa ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Emissão / Validade</th>
                <th className="px-6 py-4">Adicionais</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.map((doc) => {
                const company = companies.find((c) => c.id === doc.companyId);
                const isExpired = new Date(doc.validUntil) < new Date();
                const status = isExpired ? "expired" : doc.status;

                return (
                  <tr
                    key={doc.id}
                    className="bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            doc.type === "PGR"
                              ? "bg-blue-50 text-blue-600"
                              : doc.type === "PGR_NR18"
                                ? "bg-orange-50 text-orange-600"
                                : doc.type === "LTCAT"
                                  ? "bg-purple-50 text-purple-600"
                                  : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {doc.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {doc.type === "PGR_NR18" ? "PGR NR-18" : doc.type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {company?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">
                        {new Date(doc.issueDate).toLocaleDateString("pt-BR")}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${isExpired ? "text-red-600 font-semibold" : "text-slate-500"}`}
                      >
                        Vence:{" "}
                        {new Date(doc.validUntil).toLocaleDateString("pt-BR")}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {doc.hasInsalubrity ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-100 w-fit">
                            Insalubridade
                          </span>
                        ) : null}
                        {doc.hasPericulosity ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100 w-fit">
                            Periculosidade
                          </span>
                        ) : null}
                        {!doc.hasInsalubrity && !doc.hasPericulosity && (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : status === "draft"
                              ? "bg-slate-50 text-slate-700 border-slate-200"
                              : "bg-red-50 text-red-700 border-red-100"
                        }`}
                      >
                        {status === "active"
                          ? "Ativo"
                          : status === "draft"
                            ? "Rascunho"
                            : "Vencido"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(doc.id, doc.status)}
                          className={`p-2 rounded-lg transition-colors ${
                            status === "active"
                              ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={
                            status === "active"
                              ? "Marcar como Vencido"
                              : "Marcar como Ativo"
                          }
                        >
                          {status === "active" ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
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
              {filteredDocuments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <FileSignature className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-900">
                        Nenhum documento encontrado
                      </p>
                      <p className="text-sm">
                        Ajuste sua busca ou cadastre um novo programa/laudo.
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
          <div className="my-6 bg-white rounded-2xl shadow-xl w-full max-h-[calc(100vh-2rem)] max-w-md overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <h3 className="text-lg font-bold text-slate-900">
                Novo Programa / Laudo
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
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Empresa
                </label>
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) =>
                    setFormData({ ...formData, companyId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Tipo
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="PGR">PGR</option>
                    <option value="PGR_NR18">PGR NR-18</option>
                    <option value="LTCAT">LTCAT</option>
                    <option value="OTHER">Outro</option>
                  </select>
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
                        status: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="active">Ativo</option>
                    <option value="draft">Rascunho</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Título do Documento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Digite o título do documento"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, issueDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Validade
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.validUntil}
                    onChange={(e) =>
                      setFormData({ ...formData, validUntil: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  Controle de Adicionais
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasInsalubrity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hasInsalubrity: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">
                    Gera Insalubridade
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasPericulosity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hasPericulosity: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">
                    Gera Periculosidade
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Observações
                </label>
                <textarea
                  rows={3}
                  placeholder="Anotações adicionais..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formData.companyId || !formData.title}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

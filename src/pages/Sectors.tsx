import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import {
  Plus,
  Pencil,
  Trash2,
  Briefcase,
  Layers,
  X,
  Download,
} from "lucide-react";
import { exportTableToPDF } from "../lib/pdfUtils";

export default function Sectors() {
  const {
    sectors,
    roles,
    addSector,
    updateSector,
    deleteSector,
    addRole,
    updateRole,
    deleteRole,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"sectors" | "roles">("sectors");

  // Sector Modal State
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [sectorFormData, setSectorFormData] = useState({
    name: "",
    description: "",
  });

  // Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: "",
    sectorId: "",
    description: "",
  });

  const handleSectorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSectorId) {
      updateSector(editingSectorId, sectorFormData);
    } else {
      addSector(sectorFormData);
    }
    setIsSectorModalOpen(false);
    setSectorFormData({ name: "", description: "" });
    setEditingSectorId(null);
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoleId) {
      updateRole(editingRoleId, roleFormData);
    } else {
      addRole(roleFormData);
    }
    setIsRoleModalOpen(false);
    setRoleFormData({ name: "", sectorId: "", description: "" });
    setEditingRoleId(null);
  };

  const handleExportPDF = () => {
    if (activeTab === "sectors") {
      const columns = ["Nome do Setor", "Descrição"];
      const data = sectors.map((s) => [s.name, s.description]);
      exportTableToPDF(
        "Relatório de Setores",
        columns,
        data,
        "setores_sst_pro",
      );
    } else {
      const columns = ["Nome do Cargo", "Setor", "Descrição"];
      const data = roles.map((r) => {
        const sector = sectors.find((s) => s.id === r.sectorId);
        return [r.name, sector?.name || "N/A", r.description];
      });
      exportTableToPDF("Relatório de Cargos", columns, data, "cargos_sst_pro");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            Setores e Cargos
          </h1>
          <p className="text-slate-500 mt-1">
            Estruture a organização da empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={
              (activeTab === "sectors" && sectors.length === 0) ||
              (activeTab === "roles" && roles.length === 0)
            }
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </button>
          <button
            onClick={() => {
              setEditingSectorId(null);
              setSectorFormData({ name: "", description: "" });
              setIsSectorModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
          >
            <Layers className="w-4 h-4 mr-2" />
            Novo Setor
          </button>
          <button
            onClick={() => {
              setEditingRoleId(null);
              setRoleFormData({
                name: "",
                sectorId: sectors[0]?.id || "",
                description: "",
              });
              setIsRoleModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 h-10 px-4 py-2"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Novo Cargo
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50">
          <nav className="flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("sectors")}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-semibold text-sm transition-colors ${
                activeTab === "sectors"
                  ? "border-blue-600 text-blue-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Layers className="w-4 h-4 inline-block mr-2 mb-0.5" />
              Setores
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-semibold text-sm transition-colors ${
                activeTab === "roles"
                  ? "border-blue-600 text-blue-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Briefcase className="w-4 h-4 inline-block mr-2 mb-0.5" />
              Cargos
            </button>
          </nav>
        </div>

        <div className="p-0">
          {activeTab === "sectors" && (
            <div className="overflow-x-auto animate-in fade-in duration-300">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Nome do Setor</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sectors.map((sector) => (
                    <tr
                      key={sector.id}
                      className="bg-white hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {sector.name}
                      </td>
                      <td className="px-6 py-4">{sector.description}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSectorFormData({
                                name: sector.name,
                                description: sector.description,
                              });
                              setEditingSectorId(sector.id);
                              setIsSectorModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Tem certeza que deseja excluir este setor? Cargos associados podem ser afetados.",
                                )
                              ) {
                                deleteSector(sector.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sectors.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Layers className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-base font-medium text-slate-900">
                            Nenhum setor cadastrado
                          </p>
                          <p className="text-sm">
                            Comece adicionando os setores da empresa.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="overflow-x-auto animate-in fade-in duration-300">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Nome do Cargo</th>
                    <th className="px-6 py-4">Setor</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles.map((role) => {
                    const sector = sectors.find((s) => s.id === role.sectorId);
                    return (
                      <tr
                        key={role.id}
                        className="bg-white hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {role.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {sector?.name || "Setor não encontrado"}
                          </span>
                        </td>
                        <td className="px-6 py-4">{role.description}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setRoleFormData({
                                  name: role.name,
                                  sectorId: role.sectorId,
                                  description: role.description,
                                });
                                setEditingRoleId(role.id);
                                setIsRoleModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Tem certeza que deseja excluir este cargo?",
                                  )
                                ) {
                                  deleteRole(role.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {roles.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Briefcase className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-base font-medium text-slate-900">
                            Nenhum cargo cadastrado
                          </p>
                          <p className="text-sm">
                            Adicione cargos e vincule-os aos setores.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sector Modal */}
      {isSectorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSectorId ? "Editar Setor" : "Novo Setor"}
              </h3>
              <button
                onClick={() => setIsSectorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSectorSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nome do Setor
                </label>
                <input
                  type="text"
                  required
                  value={sectorFormData.name}
                  onChange={(e) =>
                    setSectorFormData({
                      ...sectorFormData,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ex: Produção"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={sectorFormData.description}
                  onChange={(e) =>
                    setSectorFormData({
                      ...sectorFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Descreva as atividades do setor..."
                />
              </div>
              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSectorModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shadow-blue-200 transition-all"
                >
                  Salvar Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRoleId ? "Editar Cargo" : "Novo Cargo"}
              </h3>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRoleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nome do Cargo
                </label>
                <input
                  type="text"
                  required
                  value={roleFormData.name}
                  onChange={(e) =>
                    setRoleFormData({ ...roleFormData, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ex: Operador de Máquina"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Setor
                </label>
                <select
                  required
                  value={roleFormData.sectorId}
                  onChange={(e) =>
                    setRoleFormData({
                      ...roleFormData,
                      sectorId: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>
                    Selecione um setor
                  </option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={roleFormData.description}
                  onChange={(e) =>
                    setRoleFormData({
                      ...roleFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Descreva as responsabilidades do cargo..."
                />
              </div>
              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!roleFormData.sectorId}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar Cargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

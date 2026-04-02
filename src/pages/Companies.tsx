import React, { useState } from "react";
import {
  Building2,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useAppContext } from "../store/AppContext";
import { exportTableToPDF } from "../lib/pdfUtils";
import type { Company } from "../types";

export default function Companies() {
  const { companies, addCompany, updateCompany, deleteCompany } =
    useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    address: "",
    contact: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cnpj.includes(searchTerm),
  );
  const companiesWithContact = companies.filter(
    (company) => company.contact.trim().length > 0,
  ).length;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (editingId) {
      updateCompany(editingId, formData);
    } else {
      addCompany(formData);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", cnpj: "", address: "", contact: "" });
  };

  const handleEdit = (company: Company) => {
    setFormData({
      name: company.name,
      cnpj: company.cnpj,
      address: company.address,
      contact: company.contact,
    });
    setEditingId(company.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta empresa?")) {
      deleteCompany(id);
    }
  };

  const handleExportPDF = () => {
    const columns = [
      "Nome Fantasia / Razão Social",
      "CNPJ",
      "Endereço",
      "Contato",
    ];
    const data = filteredCompanies.map((company) => [
      company.name,
      company.cnpj,
      company.address,
      company.contact,
    ]);

    exportTableToPDF(
      "Relatório de Empresas Cadastradas",
      columns,
      data,
      "empresas_sst_pro",
    );
  };

  const resetModal = () => {
    setEditingId(null);
    setFormData({ name: "", cnpj: "", address: "", contact: "" });
    setIsModalOpen(true);
  };

  const summaryStats = [
    {
      label: "Base total",
      value: companies.length,
      copy: "Empresas disponíveis no ambiente para gestão contínua.",
    },
    {
      label: "Com contato",
      value: companiesWithContact,
      copy: "Cadastros com canal direto para operação comercial e suporte.",
    },
    {
      label: "Resultados visíveis",
      value: filteredCompanies.length,
      copy: searchTerm
        ? "Filtro aplicado sobre nome fantasia, razão social ou CNPJ."
        : "Sem filtros ativos na consulta da base empresarial.",
    },
  ];

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="page-hero">
        <div className="hero-card">
          <span className="hero-accent">Cadastro empresarial</span>
          <h1 className="hero-title">
            Empresas em uma visão clara, pronta para operação em qualquer tela.
          </h1>
          <p className="hero-description">
            Concentre cadastro, busca, edição e exportação em uma listagem mais
            executiva, com leitura objetiva em desktop e cartões nativos no
            celular.
          </p>

          <div className="hero-actions">
            <button
              onClick={resetModal}
              className="btn-primary"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Nova empresa
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filteredCompanies.length === 0}
              className="btn-secondary disabled:pointer-events-none disabled:opacity-50"
              type="button"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
          </div>
        </div>

        <aside className="hero-aside">
          <div>
            <p className="eyebrow">Resumo da base</p>
            <h2 className="panel-title">Leitura rápida do cadastro</h2>
            <p className="panel-copy">
              Indicadores de volume e qualidade para a base empresarial.
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
            <p className="eyebrow">Consulta inteligente</p>
            <h2 className="panel-title">Base empresarial</h2>
            <p className="panel-copy">
              Busque por nome ou CNPJ, filtre rapidamente e faça ajustes sem
              perder contexto de tela.
            </p>
          </div>

          <div className="toolbar-actions">
            <button
              onClick={handleExportPDF}
              disabled={filteredCompanies.length === 0}
              className="btn-secondary disabled:pointer-events-none disabled:opacity-50"
              type="button"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
            <button
              onClick={resetModal}
              className="btn-primary"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Nova empresa
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="search-shell">
            <Search className="h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nome, razão social ou CNPJ..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="search-input"
            />
          </div>

          <p className="text-sm text-slate-500">
            {filteredCompanies.length} registro(s) visível(is)
          </p>
        </div>

        <div className="mobile-list mt-6 lg:hidden">
          {filteredCompanies.map((company) => (
            <article key={company.id} className="mobile-record">
              <div className="mobile-record-header">
                <div>
                  <p className="mobile-record-title">{company.name}</p>
                  <p className="mobile-record-copy">CNPJ {company.cnpj}</p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>

              <div className="mobile-record-grid">
                <div>
                  <p className="mobile-record-label">Contato</p>
                  <p className="mobile-record-value">{company.contact}</p>
                </div>
                <div>
                  <p className="mobile-record-label">Endereço</p>
                  <p className="mobile-record-value">{company.address}</p>
                </div>
              </div>

              <div className="mobile-record-actions">
                <button
                  onClick={() => handleEdit(company)}
                  className="icon-action icon-action-primary"
                  type="button"
                  aria-label={`Editar ${company.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(company.id)}
                  className="icon-action icon-action-danger"
                  type="button"
                  aria-label={`Excluir ${company.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="empty-state rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70">
              <Building2 className="h-10 w-10 text-slate-300" />
              <p className="empty-state-title">Nenhuma empresa encontrada</p>
              <p className="empty-state-copy">
                Ajuste sua busca ou cadastre uma nova empresa para continuar.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto lg:block">
          <table className="min-w-[860px] w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Nome Fantasia / Razão Social</th>
                <th className="px-6 py-4">CNPJ</th>
                <th className="px-6 py-4">Endereço</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {company.name}
                  </td>
                  <td className="px-6 py-4">{company.cnpj}</td>
                  <td className="px-6 py-4">{company.address}</td>
                  <td className="px-6 py-4">{company.contact}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(company)}
                        className="icon-action icon-action-primary"
                        type="button"
                        aria-label={`Editar ${company.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="icon-action icon-action-danger"
                        type="button"
                        aria-label={`Excluir ${company.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14">
                    <div className="empty-state">
                      <Building2 className="h-12 w-12 text-slate-300" />
                      <p className="empty-state-title">
                        Nenhuma empresa encontrada
                      </p>
                      <p className="empty-state-copy">
                        Tente ajustar sua busca ou cadastre uma nova empresa.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-md">
          <div className="my-6 w-full max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto rounded-[1.75rem] border border-white/75 bg-white/95 shadow-2xl shadow-slate-900/25">
            <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-5">
              <div>
                <p className="eyebrow">Cadastro</p>
                <h3 className="panel-title">
                  {editingId ? "Editar empresa" : "Nova empresa"}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="app-icon-button"
                type="button"
                aria-label="Fechar modal"
              >
                <span className="text-base leading-none">×</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nome / Razão Social
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Ex: Indústria Alpha S.A."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  CNPJ
                </label>
                <input
                  type="text"
                  required
                  value={formData.cnpj}
                  onChange={(event) =>
                    setFormData({ ...formData, cnpj: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Endereço
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(event) =>
                    setFormData({ ...formData, address: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Rua, número, bairro, cidade - UF"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Contato
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={(event) =>
                    setFormData({ ...formData, contact: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
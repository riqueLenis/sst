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
import { Button } from "../components/Button";
import {
  formatCEP,
  formatDocument,
  formatPhone,
  formatPhoneList,
} from "../lib/masks";
import type { Company } from "../types";

type CompanyFormState = Omit<Company, "id">;

const initialFormState: CompanyFormState = {
  documentType: "CNPJ",
  name: "",
  cnpj: "",
  razaoSocial: "",
  establishment: "matriz",
  riskLevel: "2",
  enableMapping: true,
  cnae: "",
  observations: "",
  tags: [],
  hasContact: true,
  phone: "",
  otherPhones: "",
  email: "",
  cep: "",
  city: "",
  logradouro: "",
  addressNumber: "",
  neighborhood: "",
  complement: "",
  esocial: false,
  address: "",
  contact: "",
};

const composeAddress = (form: CompanyFormState): string => {
  const street = [form.logradouro, form.addressNumber]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  return [street, form.neighborhood.trim(), form.city.trim()]
    .filter(Boolean)
    .join(" - ");
};

const fieldClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function Companies() {
  const { companies, addCompany, updateCompany, deleteCompany } =
    useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanyFormState>(initialFormState);
  const [tagInput, setTagInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateField = <K extends keyof CompanyFormState>(
    field: K,
    value: CompanyFormState[K],
  ) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) {
      return;
    }
    if (!formData.tags.includes(value)) {
      updateField("tags", [...formData.tags, value]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    updateField(
      "tags",
      formData.tags.filter((item) => item !== tag),
    );
  };

  const searchDigits = searchTerm.replace(/\D/g, "");
  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cnpj.includes(searchTerm) ||
      (searchDigits.length > 0 &&
        company.cnpj.replace(/\D/g, "").includes(searchDigits)),
  );
  const companiesWithContact = companies.filter(
    (company) => (company.contact ?? "").trim().length > 0,
  ).length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const payload: CompanyFormState = {
        ...formData,
        address: composeAddress(formData),
        contact: formData.email.trim() || formData.phone.trim(),
      };

      const saved = editingId
        ? await updateCompany(editingId, payload)
        : await addCompany(payload);

      if (!saved) {
        return;
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialFormState);
      setTagInput("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (company: Company) => {
    setFormData({
      documentType: company.documentType ?? "CNPJ",
      name: company.name ?? "",
      cnpj: company.cnpj ?? "",
      razaoSocial: company.razaoSocial ?? "",
      establishment: company.establishment ?? "matriz",
      riskLevel: company.riskLevel ?? "",
      enableMapping: company.enableMapping ?? true,
      cnae: company.cnae ?? "",
      observations: company.observations ?? "",
      tags: company.tags ?? [],
      hasContact: company.hasContact ?? true,
      phone: company.phone ?? "",
      otherPhones: company.otherPhones ?? "",
      email: company.email ?? "",
      cep: company.cep ?? "",
      city: company.city ?? "",
      logradouro: company.logradouro ?? "",
      addressNumber: company.addressNumber ?? "",
      neighborhood: company.neighborhood ?? "",
      complement: company.complement ?? "",
      esocial: company.esocial ?? false,
      address: company.address ?? "",
      contact: company.contact ?? "",
    });
    setTagInput("");
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
      {
        tag: "Cadastro de clientes",
        description:
          "Relação das empresas atendidas pela EXIN, com documento, endereço e canal de contato principal.",
        highlights: [
          { label: "Empresas listadas", value: String(data.length) },
          { label: "Base total", value: String(companies.length) },
          {
            label: "Com contato",
            value: String(
              filteredCompanies.filter((company) => company.contact?.trim())
                .length,
            ),
          },
        ],
      },
    );
  };

  const resetModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setTagInput("");
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
            Empresas em uma visão clara e organizada.
          </h1>
          <p className="hero-description">
            Cadastro, busca e exportação de empresas em uma lista clara.
          </p>

          <div className="hero-actions">
            <button onClick={resetModal} className="btn-primary" type="button">
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
            <button onClick={resetModal} className="btn-primary" type="button">
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
          <table className="min-w-215 w-full text-left text-sm text-slate-600">
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
          <div className="my-6 w-full max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto rounded-[1.75rem] border border-white/75 bg-white/95 shadow-2xl shadow-slate-900/25">
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

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>★ Tipo do documento</label>
                  <select
                    value={formData.documentType}
                    onChange={(event) => {
                      const documentType = event.target.value as
                        | "CNPJ"
                        | "CPF";
                      setFormData((previous) => ({
                        ...previous,
                        documentType,
                        cnpj: formatDocument(previous.cnpj, documentType),
                      }));
                    }}
                    className={fieldClass}
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    ★ {formData.documentType}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formData.cnpj}
                    onChange={(event) =>
                      updateField(
                        "cnpj",
                        formatDocument(
                          event.target.value,
                          formData.documentType,
                        ),
                      )
                    }
                    className={fieldClass}
                    placeholder={
                      formData.documentType === "CPF"
                        ? "000.000.000-00"
                        : "00.000.000/0000-00"
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Estabelecimento</label>
                  <select
                    value={formData.establishment}
                    onChange={(event) =>
                      updateField(
                        "establishment",
                        event.target.value as "matriz" | "filial",
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="matriz">Matriz</option>
                    <option value="filial">Filial</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Grau de risco</label>
                  <select
                    value={formData.riskLevel}
                    onChange={(event) =>
                      updateField("riskLevel", event.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="">-</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>★ Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    className={fieldClass}
                    placeholder="Nome fantasia"
                  />
                </div>

                <div>
                  <label className={labelClass}>Razão social</label>
                  <input
                    type="text"
                    value={formData.razaoSocial}
                    onChange={(event) =>
                      updateField("razaoSocial", event.target.value)
                    }
                    className={fieldClass}
                    placeholder="Razão social"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>CNAE</label>
                <input
                  type="text"
                  value={formData.cnae}
                  onChange={(event) => updateField("cnae", event.target.value)}
                  className={fieldClass}
                  placeholder="(0000-0/00) Descrição da atividade"
                />
              </div>

              <div>
                <label className={labelClass}>Observações</label>
                <textarea
                  rows={3}
                  value={formData.observations}
                  onChange={(event) =>
                    updateField("observations", event.target.value)
                  }
                  className={`${fieldClass} resize-none`}
                  placeholder="Anotações adicionais..."
                />
              </div>

              <div>
                <label className={labelClass}>Tags</label>
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 p-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-white/70 hover:text-white"
                        aria-label={`Remover tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                    onBlur={addTag}
                    className="min-w-[8rem] flex-1 border-0 bg-transparent px-2 py-1 text-sm outline-none"
                    placeholder="Adicionar tag e pressionar Enter"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 p-4">
                <button
                  type="button"
                  onClick={() => updateField("hasContact", !formData.hasContact)}
                  className="flex items-center gap-3"
                  aria-pressed={formData.hasContact}
                >
                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      formData.hasContact ? "bg-teal-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        formData.hasContact ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Contato
                  </span>
                </button>

                {formData.hasContact && (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Telefone principal</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.phone}
                        onChange={(event) =>
                          updateField("phone", formatPhone(event.target.value))
                        }
                        className={fieldClass}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Outros telefones</label>
                      <input
                        type="text"
                        value={formData.otherPhones}
                        onChange={(event) =>
                          updateField("otherPhones", event.target.value)
                        }
                        onBlur={(event) =>
                          updateField(
                            "otherPhones",
                            formatPhoneList(event.target.value),
                          )
                        }
                        className={fieldClass}
                        placeholder="Separados por vírgula"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>E-mail principal</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        className={fieldClass}
                        placeholder="contato@empresa.com"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>CEP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.cep}
                    onChange={(event) =>
                      updateField("cep", formatCEP(event.target.value))
                    }
                    className={fieldClass}
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    className={fieldClass}
                    placeholder="Cidade (UF)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
                <div>
                  <label className={labelClass}>Logradouro</label>
                  <input
                    type="text"
                    value={formData.logradouro}
                    onChange={(event) =>
                      updateField("logradouro", event.target.value)
                    }
                    className={fieldClass}
                    placeholder="Avenida, rua..."
                  />
                </div>
                <div>
                  <label className={labelClass}>Nº endereço</label>
                  <input
                    type="text"
                    value={formData.addressNumber}
                    onChange={(event) =>
                      updateField("addressNumber", event.target.value)
                    }
                    className={fieldClass}
                    placeholder="Número"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(event) =>
                      updateField("neighborhood", event.target.value)
                    }
                    className={fieldClass}
                    placeholder="Bairro"
                  />
                </div>
                <div>
                  <label className={labelClass}>Complemento</label>
                  <input
                    type="text"
                    value={formData.complement}
                    onChange={(event) =>
                      updateField("complement", event.target.value)
                    }
                    className={fieldClass}
                    placeholder="Complemento"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 p-4">
                <button
                  type="button"
                  onClick={() => updateField("esocial", !formData.esocial)}
                  className="flex items-center gap-3"
                  aria-pressed={formData.esocial}
                >
                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      formData.esocial ? "bg-teal-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        formData.esocial ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    eSocial
                  </span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Habilitar mapeamento?
                  </span>
                  <select
                    value={formData.enableMapping ? "sim" : "nao"}
                    onChange={(event) =>
                      updateField("enableMapping", event.target.value === "sim")
                    }
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <Button type="submit" loading={isSaving} loadingText="Salvando...">
                  Salvar empresa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

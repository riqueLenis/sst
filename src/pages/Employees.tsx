import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useAppContext } from "../store/AppContext";
import { exportTableToPDF } from "../lib/pdfUtils";
import { Button } from "../components/Button";
import { formatCPF } from "../lib/masks";
import {
  MIN_EMPLOYEE_AGE_YEARS,
  calculateAge,
  formatDate,
  getMaxBirthDateInput,
  getMinBirthDateInput,
  validateBirthDate,
} from "../lib/dates";
import type { Employee } from "../types";

type EmployeeFormState = Omit<Employee, "id">;

export default function Employees() {
  const {
    employees,
    companies,
    roles,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );

  const initialFormState: EmployeeFormState = {
    name: "",
    cpf: "",
    rg: "",
    birthDate: "",
    admissionDate: "",
    companyId: "",
    roleId: "",
    status: "active" as const,
    dismissalDate: "",
    dismissalNotes: "",
  };

  const [formData, setFormData] = useState<EmployeeFormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [birthDateError, setBirthDateError] = useState<string | null>(null);
  // Limites do input de data: bloqueiam a seleção de menores de 16 anos.
  const maxBirthDate = getMaxBirthDateInput();
  const minBirthDate = getMinBirthDateInput();
  const currentAge = calculateAge(formData.birthDate);

  const searchDigits = searchTerm.replace(/\D/g, "");
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.cpf.includes(searchTerm) ||
      (searchDigits.length > 0 &&
        employee.cpf.replace(/\D/g, "").includes(searchDigits));
    const matchesStatus =
      statusFilter === "all" || employee.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  const activeEmployees = employees.filter(
    (employee) => employee.status === "active",
  ).length;
  const inactiveEmployees = employees.length - activeEmployees;
  const linkedCompanies = new Set(
    employees.map((employee) => employee.companyId).filter(Boolean),
  ).size;
  const canCreateEmployee = companies.length > 0 && roles.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    // Regra de negócio: não é permitido cadastrar colaborador com menos de 16 anos.
    const birthDateValidationError = validateBirthDate(formData.birthDate);

    if (birthDateValidationError) {
      setBirthDateError(birthDateValidationError);
      return;
    }

    setBirthDateError(null);
    setIsSaving(true);

    try {
      // Ao reativar (status ativo), zera os dados de demissão.
      const payload: EmployeeFormState = {
        ...formData,
        dismissalDate:
          formData.status === "inactive" ? formData.dismissalDate : "",
        dismissalNotes:
          formData.status === "inactive" ? formData.dismissalNotes : "",
      };

      if (editingId) {
        await updateEmployee(editingId, payload);
      } else {
        await addEmployee(payload);
      }

      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
      cpf: employee.cpf,
      rg: employee.rg,
      birthDate: employee.birthDate,
      admissionDate: employee.admissionDate,
      companyId: employee.companyId,
      roleId: employee.roleId,
      status: employee.status,
      dismissalDate: employee.dismissalDate ?? "",
      dismissalNotes: employee.dismissalNotes ?? "",
    });
    setBirthDateError(null);
    setEditingId(employee.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este colaborador?")) {
      deleteEmployee(id);
    }
  };

  const handleExportPDF = () => {
    const columns = ["Nome", "CPF", "Empresa", "Cargo", "Status"];
    const data = filteredEmployees.map((employee) => {
      const company = companies.find((item) => item.id === employee.companyId);
      const role = roles.find((item) => item.id === employee.roleId);

      return [
        employee.name,
        employee.cpf,
        company?.name ?? "N/A",
        role?.name ?? "N/A",
        employee.status === "active" ? "Ativo" : "Inativo",
      ];
    });

    exportTableToPDF(
      "Relatório de Colaboradores",
      columns,
      data,
      "colaboradores_sst_pro",
      {
        tag: "Gestão de pessoas",
        description:
          "Quadro de colaboradores com vínculo, cargo e situação cadastral no momento da emissão.",
        highlights: [
          { label: "Colaboradores", value: String(data.length) },
          { label: "Ativos", value: String(activeEmployees) },
          { label: "Demitidos", value: String(inactiveEmployees) },
          { label: "Empresas", value: String(linkedCompanies) },
        ],
      },
    );
  };

  const openNewModal = () => {
    setEditingId(null);
    setBirthDateError(null);
    setFormData({
      ...initialFormState,
      companyId: companies[0]?.id ?? "",
      roleId: roles[0]?.id ?? "",
    });
    setIsModalOpen(true);
  };

  const summaryStats = [
    {
      label: "Ativos",
      value: activeEmployees,
      copy: "Colaboradores atualmente em atividade na operação.",
    },
    {
      label: "Demitidos",
      value: inactiveEmployees,
      copy: "Colaboradores desligados, mantidos no histórico.",
    },
    {
      label: "Empresas com vínculo",
      value: linkedCompanies,
      copy: searchTerm
        ? "Resultados filtrados por nome ou CPF no módulo de pessoas."
        : "Relações ativas entre colaboradores e empresas cadastradas.",
    },
  ];

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="page-hero">
        <div className="hero-card">
          <span className="hero-accent">Gestão de pessoas</span>
          <h1 className="hero-title">
            Colaboradores organizados para consulta e edição rápida.
          </h1>
          <p className="hero-description">
            Vínculos, situação e acesso ao perfil individual em uma lista objetiva.
          </p>

          <div className="hero-actions">
            <button
              onClick={openNewModal}
              disabled={!canCreateEmployee}
              className="btn-primary disabled:pointer-events-none disabled:opacity-50"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Novo colaborador
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filteredEmployees.length === 0}
              className="btn-secondary disabled:pointer-events-none disabled:opacity-50"
              type="button"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
          </div>

          {!canCreateEmployee && (
            <p className="hero-note mt-4 text-sm">
              Cadastre ao menos uma empresa e um cargo antes de incluir novos
              colaboradores.
            </p>
          )}
        </div>

        <aside className="hero-aside">
          <div>
            <p className="eyebrow">Leitura operacional</p>
            <h2 className="panel-title">Resumo do quadro</h2>
            <p className="panel-copy">
              Indicadores rápidos para priorizar consultas e manutenção do
              cadastro de pessoas.
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
            <p className="eyebrow">Busca e manutenção</p>
            <h2 className="panel-title">Base de colaboradores</h2>
            <p className="panel-copy">
              Procure por nome ou CPF, navegue para o perfil individual e ajuste
              dados cadastrais sem sair do contexto.
            </p>
          </div>

          <div className="toolbar-actions">
            <button
              onClick={handleExportPDF}
              disabled={filteredEmployees.length === 0}
              className="btn-secondary disabled:pointer-events-none disabled:opacity-50"
              type="button"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
            <button
              onClick={openNewModal}
              disabled={!canCreateEmployee}
              className="btn-primary disabled:pointer-events-none disabled:opacity-50"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Novo colaborador
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="search-shell">
            <Search className="h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="search-input"
            />
          </div>

          <p className="text-sm text-slate-500">
            {filteredEmployees.length} colaborador(es) visível(is)
          </p>
        </div>

        <div className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {(
            [
              { key: "all", label: "Todos" },
              { key: "active", label: "Ativos" },
              { key: "inactive", label: "Demitidos" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setStatusFilter(option.key)}
              className={
                statusFilter === option.key
                  ? "rounded-xl bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-sm"
                  : "rounded-xl px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mobile-list mt-6 lg:hidden">
          {filteredEmployees.map((employee) => {
            const company = companies.find(
              (item) => item.id === employee.companyId,
            );
            const role = roles.find((item) => item.id === employee.roleId);

            return (
              <article key={employee.id} className="mobile-record">
                <div className="mobile-record-header">
                  <div>
                    <p className="mobile-record-title">{employee.name}</p>
                    <p className="mobile-record-copy">CPF {employee.cpf}</p>
                  </div>

                  <span
                    className={
                      employee.status === "active"
                        ? "status-pill border border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "status-pill border border-red-100 bg-red-50 text-red-700"
                    }
                  >
                    {employee.status === "active" ? "Ativo" : "Demitido"}
                  </span>
                </div>

                <div className="mobile-record-grid">
                  <div>
                    <p className="mobile-record-label">Empresa</p>
                    <p className="mobile-record-value">
                      {company?.name ?? "Não definida"}
                    </p>
                  </div>
                  <div>
                    <p className="mobile-record-label">Cargo</p>
                    <p className="mobile-record-value">
                      {role?.name ?? "Não definido"}
                    </p>
                  </div>
                  <div>
                    <p className="mobile-record-label">Admissão</p>
                    <p className="mobile-record-value">
                      {employee.admissionDate
                        ? formatDate(employee.admissionDate)
                        : "—"}
                    </p>
                  </div>
                  {employee.status === "inactive" && (
                    <div>
                      <p className="mobile-record-label">Demissão</p>
                      <p className="mobile-record-value">
                        {employee.dismissalDate
                          ? formatDate(employee.dismissalDate)
                          : "—"}
                      </p>
                    </div>
                  )}
                </div>

                {employee.status === "inactive" && employee.dismissalNotes && (
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold">Observações:</span>{" "}
                    {employee.dismissalNotes}
                  </p>
                )}

                <div className="mobile-record-actions">
                  <Link
                    to={`/colaboradores/${employee.id}`}
                    className="icon-action icon-action-primary"
                    aria-label={`Ver perfil de ${employee.name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleEdit(employee)}
                    className="icon-action icon-action-primary"
                    type="button"
                    aria-label={`Editar ${employee.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id)}
                    className="icon-action icon-action-danger"
                    type="button"
                    aria-label={`Excluir ${employee.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}

          {filteredEmployees.length === 0 && (
            <div className="empty-state rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70">
              <Users className="h-10 w-10 text-slate-300" />
              <p className="empty-state-title">Nenhum colaborador encontrado</p>
              <p className="empty-state-copy">
                Ajuste sua busca ou cadastre um novo colaborador para continuar.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto lg:block">
          <table className="min-w-240 w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">CPF</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4">Admissão</th>
                <th className="px-6 py-4">Situação</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((employee) => {
                const company = companies.find(
                  (item) => item.id === employee.companyId,
                );
                const role = roles.find((item) => item.id === employee.roleId);

                return (
                  <tr
                    key={employee.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-xs font-bold text-sky-700">
                          {employee.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">
                          {employee.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{employee.cpf}</td>
                    <td className="px-6 py-4">
                      {company?.name ?? "Não definida"}
                    </td>
                    <td className="px-6 py-4">
                      {role?.name ?? "Não definido"}
                    </td>
                    <td className="px-6 py-4">
                      {employee.admissionDate
                        ? formatDate(employee.admissionDate)
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          employee.status === "active"
                            ? "status-pill border border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "status-pill border border-red-100 bg-red-50 text-red-700"
                        }
                      >
                        {employee.status === "active" ? "Ativo" : "Demitido"}
                      </span>
                      {employee.status === "inactive" &&
                        employee.dismissalDate && (
                          <p className="mt-1 text-xs text-slate-500">
                            em{" "}
                            {formatDate(employee.dismissalDate)}
                          </p>
                        )}
                      {employee.status === "inactive" &&
                        employee.dismissalNotes && (
                          <p
                            className="mt-0.5 max-w-56 truncate text-xs text-slate-400"
                            title={employee.dismissalNotes}
                          >
                            {employee.dismissalNotes}
                          </p>
                        )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/colaboradores/${employee.id}`}
                          className="icon-action icon-action-primary"
                          title="Ver perfil"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="icon-action icon-action-primary"
                          title="Editar"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="icon-action icon-action-danger"
                          title="Excluir"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14">
                    <div className="empty-state">
                      <Users className="h-12 w-12 text-slate-300" />
                      <p className="empty-state-title">
                        Nenhum colaborador encontrado
                      </p>
                      <p className="empty-state-copy">
                        Ajuste sua busca ou cadastre um novo colaborador.
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
                  {editingId ? "Editar colaborador" : "Novo colaborador"}
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

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) =>
                      setFormData({ ...formData, name: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Digite o nome do colaborador"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    CPF
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formData.cpf}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        cpf: formatCPF(event.target.value),
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Data de nascimento
                  </label>
                  <input
                    type="date"
                    required
                    min={minBirthDate}
                    max={maxBirthDate}
                    value={formData.birthDate}
                    onChange={(event) => {
                      const birthDate = event.target.value;
                      setFormData({ ...formData, birthDate });
                      setBirthDateError(
                        birthDate ? validateBirthDate(birthDate) : null,
                      );
                    }}
                    aria-invalid={birthDateError ? true : undefined}
                    className={
                      birthDateError
                        ? "w-full rounded-2xl border border-red-300 bg-red-50/50 px-4 py-3 text-sm"
                        : "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    }
                  />
                  {birthDateError ? (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">
                      {birthDateError}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500">
                      {currentAge !== null && currentAge >= 0
                        ? `Idade: ${currentAge} anos.`
                        : `Idade mínima permitida: ${MIN_EMPLOYEE_AGE_YEARS} anos.`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Data de admissão
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.admissionDate}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        admissionDate: event.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Empresa
                  </label>
                  <select
                    required
                    value={formData.companyId}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        companyId: event.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Cargo
                  </label>
                  <select
                    required
                    value={formData.roleId}
                    onChange={(event) =>
                      setFormData({ ...formData, roleId: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="" disabled>
                      Selecione um cargo
                    </option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Situação
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        status: event.target.value as "active" | "inactive",
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="active">Ativo (admitido)</option>
                    <option value="inactive">Demitido</option>
                  </select>
                </div>
              </div>

              {formData.status === "inactive" && (
                <div className="mt-4 space-y-4 rounded-2xl border border-red-100 bg-red-50/50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    Dados da demissão
                  </p>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Data de demissão
                    </label>
                    <input
                      type="date"
                      required
                      min={formData.admissionDate || undefined}
                      value={formData.dismissalDate ?? ""}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          dismissalDate: event.target.value,
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Observações{" "}
                      <span className="font-normal text-slate-400">
                        (opcional)
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={formData.dismissalNotes ?? ""}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          dismissalNotes: event.target.value,
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Motivo do desligamento, pendências, observações relevantes..."
                    />
                  </div>
                </div>
              )}

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
                  Salvar colaborador
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

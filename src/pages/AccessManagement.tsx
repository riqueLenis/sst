import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import { useAuth } from "../store/AuthContext";
import type { ManagedUser, UserRole } from "../types";

type UserFormState = {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  isActive: boolean;
};

const initialFormState: UserFormState = {
  name: "",
  username: "",
  password: "",
  role: "manager",
  isActive: true,
};

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Gestor",
  technician: "Técnico",
};

export default function AccessManagement() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [formData, setFormData] = useState<UserFormState>(initialFormState);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const isEditing = editingUserId !== null;

  const loadUsers = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);

    try {
      const nextUsers = await apiClient.get<ManagedUser[]>("/api/auth/users", {
        token,
      });
      setUsers(nextUsers);
      setError(null);
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const summaryStats = useMemo(
    () => [
      {
        label: "Usuários ativos",
        value: users.filter((user) => user.isActive).length,
        copy: "Contas válidas para autenticação no sistema.",
      },
      {
        label: "Administradores",
        value: users.filter((user) => user.role === "admin").length,
        copy: "Perfis com autonomia para criar novos acessos.",
      },
      {
        label: "Gestores e técnicos",
        value: users.filter((user) => user.role !== "admin").length,
        copy: "Perfis operacionais mantidos diretamente pelo admin.",
      },
    ],
    [users],
  );

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingUserId(null);
  };

  const startEdit = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setError(null);
    setSuccessMessage(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (editingUserId) {
        const changes: Record<string, unknown> = {
          name: formData.name,
          role: formData.role,
          isActive: formData.isActive,
        };

        if (formData.password.trim().length > 0) {
          changes.password = formData.password;
        }

        await apiClient.patch<ManagedUser>(
          `/api/auth/users/${editingUserId}`,
          changes,
          { token },
        );
        setSuccessMessage("Usuário atualizado com sucesso.");
      } else {
        await apiClient.post<ManagedUser>(
          "/api/auth/users",
          {
            name: formData.name,
            username: formData.username,
            password: formData.password,
            role: formData.role,
          },
          { token },
        );
        setSuccessMessage("Novo acesso criado com sucesso.");
      }

      resetForm();
      await loadUsers();
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (!token || deletingUserId) {
      return;
    }

    if (
      !window.confirm(
        `Excluir o acesso de "${user.name}" (@${user.username})? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setDeletingUserId(user.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiClient.delete(`/api/auth/users/${user.id}`, { token });

      if (editingUserId === user.id) {
        resetForm();
      }

      setSuccessMessage("Usuário removido com sucesso.");
      await loadUsers();
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
    } finally {
      setDeletingUserId(null);
    }
  };

  const updateField = <K extends keyof UserFormState>(
    field: K,
    value: UserFormState[K],
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="page-hero">
        <div className="hero-card">
          <span className="hero-accent">Acessos do sistema</span>
          <h1 className="hero-title">
            Crie logins administrativos e operacionais sem expor credenciais na tela pública.
          </h1>
          <p className="hero-description">
            Crie e gerencie os logins do sistema direto pelo backend.
          </p>

          <div className="hero-actions">
            <div className="btn-soft">
              <ShieldCheck className="h-4 w-4" />
              Credenciais não expostas na página de login
            </div>
            <div className="btn-secondary">
              <Users className="h-4 w-4" />
              Cadastro centralizado pelo admin
            </div>
          </div>
        </div>

        <aside className="hero-aside">
          <div>
            <p className="eyebrow">Resumo de acessos</p>
            <h2 className="panel-title">Visão rápida dos logins</h2>
            <p className="panel-copy">
              Controle da base de usuários usada pela autenticação real do sistema.
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{isEditing ? "Editar acesso" : "Novo login"}</p>
              <h2 className="panel-title">
                {isEditing ? "Editar usuário" : "Cadastrar usuário"}
              </h2>
              <p className="panel-copy">
                {isEditing
                  ? "Atualize nome, perfil, situação e, se desejar, defina uma nova senha."
                  : "Defina nome, login, senha e perfil para liberar o acesso pelo banco."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Nome completo
              </label>
              <input
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="search-input"
                placeholder="Ex.: Saulo Exin"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Usuário de login
              </label>
              <input
                value={formData.username}
                onChange={(event) =>
                  updateField("username", event.target.value)
                }
                className="search-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Ex.: saulo"
                autoComplete="username"
                spellCheck={false}
                required={!isEditing}
                disabled={isEditing}
              />
              {isEditing && (
                <p className="mt-1.5 text-xs text-slate-500">
                  O login não pode ser alterado após a criação.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {isEditing ? "Nova senha (opcional)" : "Senha inicial"}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
                className="search-input"
                placeholder={
                  isEditing
                    ? "Deixe em branco para manter a senha atual"
                    : "Informe uma senha forte"
                }
                autoComplete="new-password"
                required={!isEditing}
                minLength={8}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                {isEditing
                  ? "Preencha apenas se quiser trocar a senha (mínimo de 8 caracteres, com letras e números)."
                  : "Mínimo de 8 caracteres, com letras e números."}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Perfil de acesso
              </label>
              <select
                value={formData.role}
                onChange={(event) =>
                  updateField("role", event.target.value as UserRole)
                }
                className="search-input"
              >
                <option value="admin">Administrador</option>
                <option value="manager">Gestor</option>
                <option value="technician">Técnico</option>
              </select>
            </div>

            {isEditing && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Situação
                </label>
                <select
                  value={formData.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    updateField("isActive", event.target.value === "active")
                  }
                  className="search-input"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {isEditing && (
                <button
                  type="button"
                  className="btn-secondary w-full justify-center sm:w-auto"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="btn-primary w-full justify-center"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSubmitting
                  ? isEditing
                    ? "Salvando..."
                    : "Criando login..."
                  : isEditing
                    ? "Salvar alterações"
                    : "Criar acesso"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Usuários cadastrados</p>
              <h2 className="panel-title">Logins atuais do sistema</h2>
              <p className="panel-copy">
                Relação de usuários já persistidos no banco para autenticação.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-state rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70">
              <KeyRound className="h-10 w-10 text-slate-300" />
              <p className="empty-state-title">Carregando acessos</p>
              <p className="empty-state-copy">
                Aguarde enquanto consultamos os usuários cadastrados no backend.
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70">
              <UserPlus className="h-10 w-10 text-slate-300" />
              <p className="empty-state-title">Nenhum usuário cadastrado</p>
              <p className="empty-state-copy">
                Crie o primeiro acesso administrativo para liberar o uso do sistema.
              </p>
            </div>
          ) : (
            <>
              <div className="mobile-list lg:hidden">
                {users.map((user) => (
                  <article key={user.id} className="mobile-record">
                    <div className="mobile-record-header">
                      <div>
                        <p className="mobile-record-title">{user.name}</p>
                        <p className="mobile-record-copy">@{user.username}</p>
                      </div>

                      <span className="status-pill border border-blue-100 bg-blue-50 text-blue-700">
                        {roleLabels[user.role]}
                      </span>
                    </div>

                    <div className="mobile-record-grid">
                      <div>
                        <p className="mobile-record-label">Status</p>
                        <p className="mobile-record-value">
                          {user.isActive ? "Ativo" : "Inativo"}
                        </p>
                      </div>
                      <div>
                        <p className="mobile-record-label">Criado em</p>
                        <p className="mobile-record-value">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                            : "Sem registro"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      {currentUser?.id !== user.id && (
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          disabled={deletingUserId === user.id}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingUserId === user.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Excluir
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Usuário</th>
                      <th className="px-4 py-3">Perfil</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Criado em</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {user.name}
                        </td>
                        <td className="px-4 py-4">{user.username}</td>
                        <td className="px-4 py-4">{roleLabels[user.role]}</td>
                        <td className="px-4 py-4">
                          <span className="status-pill border border-emerald-100 bg-emerald-50 text-emerald-700">
                            {user.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                            : "Sem registro"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(user)}
                              title="Editar usuário"
                              aria-label={`Editar ${user.name}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {currentUser?.id !== user.id ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(user)}
                                disabled={deletingUserId === user.id}
                                title="Excluir usuário"
                                aria-label={`Excluir ${user.name}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingUserId === user.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">
                                Você
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
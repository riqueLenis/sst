import React, { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, ShieldCheck, UserPlus, Users } from "lucide-react";
import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import { useAuth } from "../store/AuthContext";
import type { ManagedUser, UserRole } from "../types";

type UserFormState = {
  name: string;
  username: string;
  password: string;
  role: UserRole;
};

const initialFormState: UserFormState = {
  name: "",
  username: "",
  password: "",
  role: "manager",
};

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Gestor",
  technician: "Técnico",
};

export default function AccessManagement() {
  const { token } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [formData, setFormData] = useState<UserFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiClient.post<ManagedUser>("/api/auth/users", formData, {
        token,
      });
      setFormData(initialFormState);
      setSuccessMessage("Novo acesso criado com sucesso.");
      await loadUsers();
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
    } finally {
      setIsSubmitting(false);
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
            O administrador passa a controlar diretamente quem entra no sistema,
            com criação de usuários no backend e autenticação validada contra o banco.
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
              <p className="eyebrow">Novo login</p>
              <h2 className="panel-title">Cadastrar usuário</h2>
              <p className="panel-copy">
                Defina nome, login, senha e perfil para liberar o acesso pelo banco.
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
                className="search-input"
                placeholder="Ex.: saulo"
                autoComplete="username"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Senha inicial
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
                className="search-input"
                placeholder="Informe uma senha forte"
                autoComplete="new-password"
              />
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

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Criando login..." : "Criar acesso"}
            </button>
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
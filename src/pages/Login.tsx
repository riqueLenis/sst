import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../lib/apiClient";
import { useAuth } from "../store/AuthContext";

const demoAccounts = [
  {
    role: "Administrador",
    username: "admin",
    password: "Admin@123",
    description: "Acesso completo a cadastros, financeiro e configurações críticas.",
  },
  {
    role: "Gestor",
    username: "gestor",
    password: "Gestor@123",
    description: "Operação ampla com foco gerencial e acompanhamento das rotinas.",
  },
  {
    role: "Tecnico",
    username: "tecnico",
    password: "Tecnico@123",
    description: "Execução operacional de SST, entregas, saúde ocupacional e documentos.",
  },
  {
    role: "Consulta",
    username: "consulta",
    password: "Consulta@123",
    description: "Perfil somente leitura para auditoria e acompanhamento executivo.",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [credentials, setCredentials] = useState({
    username: "admin",
    password: "Admin@123",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname ?? "/";
  }, [location.state]);

  if (isAuthenticated && !isLoading) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(credentials.username, credentials.password);
      navigate(redirectPath, { replace: true });
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hero-card flex flex-col justify-between overflow-hidden">
          <div>
            <span className="hero-accent">Acesso seguro</span>
            <h1 className="hero-title mt-3 max-w-2xl">
              Entre no painel SST com autenticação real e permissões por perfil.
            </h1>
            <p className="hero-description mt-4 max-w-2xl">
              O frontend agora consome a API autenticada, com sessão validada no backend e dados persistidos em banco local.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {demoAccounts.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() =>
                  setCredentials({
                    username: account.username,
                    password: account.password,
                  })
                }
                className="rounded-3xl border border-white/60 bg-white/80 p-5 text-left shadow-lg shadow-slate-200/40 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{account.role}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {account.username} / {account.password}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-3 text-sm text-slate-600">{account.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="panel flex flex-col justify-center">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br from-teal-500 to-sky-600 text-white shadow-lg shadow-sky-200/50">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <p className="eyebrow">Login</p>
          <h2 className="panel-title mt-2">Sessão operacional</h2>
          <p className="panel-copy mt-3">
            Use um perfil autorizado para acessar o painel e operar os módulos do sistema.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Usuário
              </label>
              <div className="search-shell rounded-2xl border border-slate-200">
                <UserCircle2 className="h-5 w-5 text-slate-400" />
                <input
                  value={credentials.username}
                  onChange={(event) =>
                    setCredentials((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  className="w-full border-0 bg-transparent px-0 py-0 shadow-none"
                  placeholder="Digite seu usuário"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Senha
              </label>
              <div className="search-shell rounded-2xl border border-slate-200">
                <KeyRound className="h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(event) =>
                    setCredentials((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="w-full border-0 bg-transparent px-0 py-0 shadow-none"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={isSubmitting || isLoading}
            >
              <ArrowRight className="h-4 w-4" />
              {isSubmitting ? "Validando sessão..." : "Entrar no sistema"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
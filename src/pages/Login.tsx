import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../lib/apiClient";
import { useAuth } from "../store/AuthContext";

const securityHighlights = [
  "Credenciais não ficam mais expostas na tela inicial.",
  "O acesso depende de contas geridas diretamente pelo administrador.",
  "Cada perfil recebe somente os módulos permitidos para sua função.",
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl items-stretch gap-4 lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:gap-6">
        <section className="hero-card order-2 flex flex-col justify-between gap-6 overflow-hidden p-5 sm:p-6 lg:order-1 lg:p-8">
          <div>
            <span className="hero-accent">Acesso seguro</span>
            <h1 className="hero-title mt-3 max-w-2xl">
              Entre no painel SST com autenticação real e permissões por perfil.
            </h1>
            <p className="hero-description mt-4 max-w-2xl">
              O frontend consome a API autenticada com sessão validada no backend e permissões aplicadas por usuário cadastrado.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
            {securityHighlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-3xl border border-white/60 bg-white/80 p-4 text-left shadow-lg shadow-slate-200/40 sm:p-5"
              >
                <p className="text-sm font-semibold text-slate-900">
                  Controle de acesso
                </p>
                <p className="mt-3 text-sm text-slate-600">{highlight}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel order-1 mx-auto flex w-full max-w-xl flex-col justify-center p-5 sm:p-6 lg:order-2 lg:max-w-none lg:p-8">
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
              <div className="group flex min-h-[3.35rem] items-center gap-3 rounded-2xl border border-slate-200 bg-white/92 px-4 transition-all duration-200 focus-within:border-sky-200 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(14,116,144,0.12)]">
                <UserCircle2 className="h-5 w-5 shrink-0 text-slate-400 transition-colors duration-200 group-focus-within:text-sky-600" />
                <input
                  value={credentials.username}
                  onChange={(event) =>
                    setCredentials((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:shadow-none"
                  placeholder="Digite seu usuário"
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Senha
              </label>
              <div className="group flex min-h-[3.35rem] items-center gap-3 rounded-2xl border border-slate-200 bg-white/92 px-4 transition-all duration-200 focus-within:border-sky-200 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(14,116,144,0.12)]">
                <KeyRound className="h-5 w-5 shrink-0 text-slate-400 transition-colors duration-200 group-focus-within:text-sky-600" />
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  value={credentials.password}
                  onChange={(event) =>
                    setCredentials((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:shadow-none"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((value) => !value)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
                  aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                >
                  {isPasswordVisible ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
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
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isSubmitting ? "Validando sessão..." : "Entrar no sistema"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
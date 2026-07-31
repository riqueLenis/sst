import React from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  /** Título exibido no lugar da tela em branco. */
  title?: string;
  /** Ação extra executada ao clicar em "Tentar novamente". */
  onReset?: () => void;
  /** Centraliza o aviso na página inteira (usado fora do layout autenticado). */
  fullPage?: boolean;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Captura erros de renderização em vez de deixar a tela ficar em branco.
 * Sem este limite, qualquer exceção durante o render derruba toda a árvore do
 * React e o usuário vê apenas uma página branca, sem nenhuma pista do problema.
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Mantém o rastro no console para diagnóstico (inclusive em produção).
    console.error("[EXIN SST] Erro de renderização:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    const fallback = (
      <div className="panel max-w-3xl">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <p className="eyebrow mt-6">Falha inesperada</p>
        <h1 className="panel-title mt-2">
          {this.props.title ?? "Não foi possível exibir esta tela"}
        </h1>
        <p className="panel-copy mt-3 max-w-2xl">
          A operação anterior foi interrompida por um erro na interface. Nenhum
          dado foi perdido: recarregue a tela ou tente novamente.
        </p>

        <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Detalhes técnicos
          </summary>
          <p className="mt-2 break-words font-mono text-xs text-slate-600">
            {error.message || "Erro sem mensagem."}
          </p>
        </details>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn-primary" onClick={this.handleReset}>
            <RotateCcw className="h-4 w-4" />
            Tentar novamente
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={this.handleReload}
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar página
          </button>
        </div>
      </div>
    );

    if (!this.props.fullPage) {
      return fallback;
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        {fallback}
      </div>
    );
  }
}

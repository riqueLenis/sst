import React from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../lib/utils";

type ButtonVariant = "primary" | "secondary" | "soft";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  soft: "btn-soft",
};

/**
 * Botão padrão com estado de loading embutido: mostra um spinner, troca o texto
 * e fica desabilitado enquanto a ação está em andamento, evitando cliques duplos.
 */
export function Button({
  variant = "primary",
  loading = false,
  loadingText,
  icon,
  children,
  className,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(variantClass[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {loading ? loadingText ?? children : children}
    </button>
  );
}

export default Button;

import { apiClient } from "./apiClient";

/**
 * Consulta de Certificado de Aprovação (CA)
 * oficial do CAEPI (atualizada diariamente) e responde estas consultas
 */

export type CaepiSituation =
  | "valido"
  | "vencido"
  | "suspenso"
  | "cancelado"
  | "desconhecido";

export type CaepiRecord = {
  ca: string;
  validade: string | null;
  situacao: string;
  situacaoNormalizada: CaepiSituation;
  vencido: boolean;
  regular: boolean;
  processo: string;
  cnpj: string;
  razaoSocial: string;
  natureza: string;
  equipamento: string;
  descricao: string;
  marca: string;
  referencia: string;
  cor: string;
  aprovadoPara: string;
  restricao: string;
  observacao: string;
  cnpjLaboratorio: string;
  razaoSocialLaboratorio: string;
  numeroLaudo: string;
  norma: string;
  atualizadoEm?: string;
};

export type CaepiStatus = {
  total: number;
  lastSyncAt: string | null;
  lastSyncRecords: number | null;
  /** O arquivo publicado pelo MTE veio incompleto na última importação. */
  partial: boolean;
  lastError: string | null;
  source: string;
  syncing: boolean;
};

/** Mantém só os dígitos: o cadastro aceita "CA 12345", "12.345" etc. */
export const normalizeCaNumber = (value: string) => value.replace(/\D/g, "");

export const CAEPI_SITUATION_LABELS: Record<CaepiSituation, string> = {
  valido: "CA válido",
  vencido: "CA vencido",
  suspenso: "CA suspenso",
  cancelado: "CA cancelado",
  desconhecido: "Situação não informada",
};

export const CAEPI_SITUATION_CLASSES: Record<CaepiSituation, string> = {
  valido: "border-emerald-100 bg-emerald-50 text-emerald-700",
  vencido: "border-red-100 bg-red-50 text-red-700",
  suspenso: "border-amber-100 bg-amber-50 text-amber-700",
  cancelado: "border-red-100 bg-red-50 text-red-700",
  desconhecido: "border-slate-200 bg-slate-50 text-slate-600",
};

export const fetchCaepiRecord = (ca: string, token?: string | null) =>
  apiClient.get<CaepiRecord>(`/api/caepi/${normalizeCaNumber(ca)}`, { token });

export const fetchCaepiRecords = (numbers: string[], token?: string | null) =>
  apiClient.post<CaepiRecord[]>(
    "/api/caepi/lookup",
    { numbers: numbers.map(normalizeCaNumber).filter(Boolean) },
    { token },
  );

export const fetchCaepiStatus = (token?: string | null) =>
  apiClient.get<CaepiStatus>("/api/caepi/status", { token });

export const syncCaepiBase = (token?: string | null) =>
  apiClient.post<{ records?: number; skipped?: boolean }>(
    "/api/caepi/sync",
    undefined,
    { token },
  );

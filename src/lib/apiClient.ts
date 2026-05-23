type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
  headers?: HeadersInit;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
    details?: unknown;
    requestId?: string;
  };
};

type ApiEnvelope<T> = {
  data: T;
  meta?: {
    message?: string;
  };
};

export class ApiError extends Error {
  status: number;
  details?: unknown;
  requestId?: string;

  constructor(status: number, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export const COOKIE_SESSION_TOKEN = "__cookie_session__";

const LOCAL_API_BASE_URL = "http://localhost:4000";
const PRODUCTION_API_BASE_URL = "https://api.exingroup.com.br";

const isLocalHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    return LOCAL_API_BASE_URL;
  }

  return PRODUCTION_API_BASE_URL;
};

const resolveApiPath = (path: string) => {
  const normalizedBase = resolveApiBaseUrl();

  return `${normalizedBase}${path}`;
};

const parseResponse = async <T>(response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null as T;
  }

  return (await response.json()) as T;
};

const request = async <T>(path: string, options: RequestOptions = {}) => {
  const { method = "GET", token, body, headers } = options;
  const accessToken = token && token !== COOKIE_SESSION_TOKEN ? token : null;

  const response = await fetch(resolveApiPath(path), {
    method,
    credentials: "include",
    referrerPolicy: "strict-origin-when-cross-origin",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse<ApiEnvelope<T> & ApiErrorPayload>(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.message ?? "Falha ao processar a requisição.",
      payload?.error?.details,
      payload?.error?.requestId,
    );
  }

  return payload?.data as T;
};

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export const getApiErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Falha inesperada ao comunicar com a API.";
};
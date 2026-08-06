import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const envFileCandidates = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(currentDirectory, "../.env.local"),
  path.resolve(currentDirectory, "../.env"),
  path.resolve(currentDirectory, "../../.env.local"),
  path.resolve(currentDirectory, "../../.env"),
];

const envFilePaths = [...new Set(envFileCandidates)].filter((filePath) =>
  fs.existsSync(filePath),
);

dotenv.config(envFilePaths.length > 0 ? { path: envFilePaths } : undefined);

const nodeEnv = process.env.NODE_ENV ?? "development";

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const normalizeUsername = (value) => String(value ?? "").trim().toLowerCase();

const normalizeOrigin = (value) =>
  value
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\/$/, "");

const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://exingroup.com.br",
  "https://www.exingroup.com.br",
  "https://api.exingroup.com.br",
].map(normalizeOrigin);

const parseOrigins = (value) => {
  if (!value) {
    return defaultCorsOrigins;
  }

  return value.split(",").map(normalizeOrigin).filter(Boolean);
};

const readEnv = (...names) => {
  for (const name of names) {
    const value = process.env[name];

    if (value != null && value !== "") {
      return value;
    }
  }

  return undefined;
};

export const env = {
  nodeEnv,
  host: readEnv("HOST") ?? "0.0.0.0",
  port: parseNumber(readEnv("PORT"), 4000),
  mysqlHost: readEnv("DB_HOST", "MYSQL_HOST") ?? "localhost",
  mysqlPort: parseNumber(readEnv("DB_PORT", "MYSQL_PORT"), 3306),
  mysqlUser: readEnv("DB_USER", "MYSQL_USER") ?? "root",
  mysqlPassword: readEnv("DB_PASSWORD", "MYSQL_PASSWORD") ?? "",
  mysqlDatabase: readEnv("DB_NAME", "MYSQL_DATABASE") ?? "sst",
  mysqlConnectionLimit: parseNumber(readEnv("MYSQL_CONNECTION_LIMIT"), 10),
  mysqlAutoCreateDatabase: parseBoolean(
    readEnv("MYSQL_AUTO_CREATE_DATABASE"),
    nodeEnv !== "production",
  ),

  trustProxy: parseBoolean(readEnv("TRUST_PROXY"), nodeEnv === "production"),
  corsOrigins: parseOrigins(readEnv("CORS_ORIGIN")),
  rateLimitWindowMs: parseNumber(
    readEnv("RATE_LIMIT_WINDOW_MS"),
    15 * 60 * 1000,
  ),
  rateLimitMax: parseNumber(readEnv("RATE_LIMIT_MAX"), 200),
  bodyLimit: readEnv("BODY_LIMIT") ?? "12mb",
  caepiFilePath: readEnv("CAEPI_FILE_PATH"),
  authCookieName: readEnv("AUTH_COOKIE_NAME") ?? "sst_access_token",
  authCookieSecure: parseBoolean(
    readEnv("AUTH_COOKIE_SECURE"),
    nodeEnv === "production",
  ),
  authCookieSameSite: readEnv("AUTH_COOKIE_SAME_SITE") ?? "strict",
  jwtSecret: readEnv("AUTH_JWT_SECRET", "JWT_SECRET") ?? "dev-only-change-me",
  jwtExpiresIn: readEnv("JWT_EXPIRES_IN") ?? "8h",
  bootstrapAdmin: {
    enabled: parseBoolean(readEnv("BOOTSTRAP_ADMIN_ENABLED"), true),
    username: normalizeUsername(readEnv("BOOTSTRAP_ADMIN_USERNAME") ?? "admin"),
    password: readEnv("BOOTSTRAP_ADMIN_PASSWORD") ?? "Exin@2025Admin",
    name: readEnv("BOOTSTRAP_ADMIN_NAME") ?? "Administrador EXIN",
  },
};

if (env.nodeEnv === "production" && env.jwtSecret === "dev-only-change-me") {
  throw new Error("Configure JWT_SECRET ou AUTH_JWT_SECRET antes de subir o backend em produção.");
}

if (
  env.nodeEnv === "production" &&
  env.bootstrapAdmin.enabled &&
  env.bootstrapAdmin.password === "Exin@2025Admin"
) {
  console.warn(
    "[sst-api] AVISO: BOOTSTRAP_ADMIN_PASSWORD está usando o valor padrão. Troque a senha do admin imediatamente após o primeiro login em produção.",
  );
}

import dotenv from "dotenv";

dotenv.config();

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOrigins = (value) => {
  if (!value) {
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port: parseNumber(process.env.PORT, 4000),
  mysqlHost: process.env.MYSQL_HOST ?? "localhost",
  mysqlPort: parseNumber(process.env.MYSQL_PORT, 3306),
  mysqlUser: process.env.MYSQL_USER ?? "root",
  mysqlPassword: process.env.MYSQL_PASSWORD ?? "",
  mysqlDatabase: process.env.MYSQL_DATABASE ?? "sst",
  mysqlConnectionLimit: parseNumber(process.env.MYSQL_CONNECTION_LIMIT, 10),
  trustProxy: process.env.TRUST_PROXY === "true",
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  rateLimitWindowMs: parseNumber(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  ),
  rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 200),
  bodyLimit: process.env.BODY_LIMIT ?? "12mb",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
};

if (env.nodeEnv === "production" && env.jwtSecret === "dev-only-change-me") {
  throw new Error("Configure JWT_SECRET antes de subir o backend em produção.");
}

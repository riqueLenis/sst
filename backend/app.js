import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import { env } from "./config/env.js";
import { HttpError } from "./lib/http-error.js";
import { MySqlStore } from "./lib/store.js";
import { authenticate } from "./middlewares/authenticate.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { createAuthRouter } from "./routes/auth.js";
import { apiResources, createApiRouter } from "./routes/api.js";
import { AuthService } from "./services/auth-service.js";

const normalizeOrigin = (value) => value.replace(/\/$/, "");

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  return (
    env.corsOrigins.includes("*") ||
    env.corsOrigins.includes(normalizedOrigin) ||
    (env.nodeEnv !== "production" && isDevelopmentOrigin(normalizedOrigin))
  );
};

const isPrivateIpv4Address = (hostname) => {
  const octets = hostname.split(".").map(Number);

  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
};

const isDevelopmentOrigin = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);

    if (!["http:", "https:"].includes(protocol)) {
      return false;
    }

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      isPrivateIpv4Address(hostname)
    );
  } catch {
    return false;
  }
};

const createCorsOptions = () => ({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(
      new HttpError(403, "Origem não autorizada pelo CORS.", { origin }),
    );
  },
  credentials: true,
});

const createApiRateLimiter = () =>
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new HttpError(
          429,
          "Muitas requisições em pouco tempo. Aguarde alguns instantes e tente novamente.",
        ),
      );
    },
  });

const createLoginRateLimiter = () =>
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: Math.max(5, Math.ceil(env.rateLimitMax / 20)),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) => {
      next(
        new HttpError(
          429,
          "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.",
        ),
      );
    },
  });

const setSensitiveResponseHeaders = (_req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
};

const setBrowserSecurityHeaders = (_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
};

export const createApp = async () => {
  const app = express();
  const store = await MySqlStore.create();
  const authService = new AuthService(store.userRepository);
  await authService.bootstrapUsers();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");

  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("x-request-id", req.requestId);
    next();
  });

  app.use(
    helmet({
      // A API responde apenas JSON; uma CSP mínima bloqueia qualquer tentativa
      // de renderizar/injetar recursos a partir das respostas do backend.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'none'"],
          "frame-ancestors": ["'none'"],
          "base-uri": ["'none'"],
          "form-action": ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
      frameguard: { action: "deny" },
      hsts:
        env.nodeEnv === "production"
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true,
            }
          : false,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );
  app.use(setBrowserSecurityHeaders);
  app.use(hpp());
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: env.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      mode: store.persistenceMode,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  });

  app.get("/", (_req, res) => {
    res.json({
      name: "EXIN Backend API",
      version: "1.0.0",
      persistence: store.persistenceMode,
      apiBase: "/api",
      resources: apiResources.map((resource) => ({
        name: resource.label,
        path: `/api${resource.path}`,
        methods: resource.methods,
      })),
    });
  });

  app.use("/api/auth/login", createLoginRateLimiter());
  app.use("/api/auth", setSensitiveResponseHeaders, createApiRateLimiter());
  app.use("/api/auth", createAuthRouter(authService));
  app.use(
    "/api",
    setSensitiveResponseHeaders,
    createApiRateLimiter(),
    authenticate(authService),
    createApiRouter(store),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

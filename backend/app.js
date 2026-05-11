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

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return (
    env.corsOrigins.includes("*") ||
    env.corsOrigins.includes(origin) ||
    (env.nodeEnv !== "production" && isDevelopmentOrigin(origin))
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

export const createApp = async () => {
  const app = express();
  const store = await MySqlStore.create();
  const authService = new AuthService(store.userRepository);
  await authService.bootstrapUsers();
  const apiRateLimitMax =
    env.nodeEnv === "production"
      ? env.rateLimitMax
      : Math.max(env.rateLimitMax, 1000);

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
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(hpp());
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: env.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));

  const apiLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: apiRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Limite de requisições excedido. Tente novamente em instantes.",
      },
    },
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Muitas tentativas de login. Aguarde alguns minutos.",
      },
    },
  });

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
      name: "SST Backend API",
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

  app.use("/api/auth", setSensitiveResponseHeaders);
  app.use("/api/auth/login", loginLimiter);
  app.use("/api/auth", createAuthRouter(authService));
  app.use(
    "/api",
    setSensitiveResponseHeaders,
    apiLimiter,
    authenticate(authService),
    createApiRouter(store),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
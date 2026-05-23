import { env } from "../config/env.js";

const parseDurationToMs = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value * 1000;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  if (/^\d+$/.test(normalizedValue)) {
    return Number(normalizedValue) * 1000;
  }

  const match = normalizedValue.match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const unitToMs = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * unitToMs[unit];
};

const normalizeSameSite = (value) => {
  const normalizedValue = String(value ?? "strict").trim().toLowerCase();

  if (["lax", "strict", "none"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return "strict";
};

const buildCookieOptions = () => {
  const maxAge = parseDurationToMs(env.jwtExpiresIn);

  return {
    httpOnly: true,
    sameSite: normalizeSameSite(env.authCookieSameSite),
    secure: env.authCookieSecure,
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
};

export const setAuthCookie = (res, token) => {
  res.cookie(env.authCookieName, token, buildCookieOptions());
};

export const clearAuthCookie = (res) => {
  const { maxAge, ...cookieOptions } = buildCookieOptions();
  void maxAge;
  res.clearCookie(env.authCookieName, cookieOptions);
};

export const readAuthCookieToken = (req) => {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  for (const cookiePart of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookiePart.split("=");

    if (!rawName || rawName.trim() !== env.authCookieName) {
      continue;
    }

    const rawValue = rawValueParts.join("=").trim();

    if (!rawValue) {
      return null;
    }

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
};
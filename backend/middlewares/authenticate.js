import { HttpError } from "../lib/http-error.js";
import { clearAuthCookie, readAuthCookieToken } from "../lib/auth-cookie.js";

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
};

export const authenticate = (authService) => async (req, _res, next) => {
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  const bearerToken = extractBearerToken(req.headers.authorization);
  const cookieToken = bearerToken ? null : readAuthCookieToken(req);
  const token = bearerToken ?? cookieToken;
  const tokenSource = bearerToken ? "header" : cookieToken ? "cookie" : null;

  try {
    if (!token) {
      throw new HttpError(401, "Token de acesso ausente.");
    }

    req.authToken = token;
    req.authUser = await authService.verifyAccessToken(token);
    next();
  } catch (error) {
    if (tokenSource === "cookie") {
      clearAuthCookie(_res);
    }

    next(error);
  }
};

export const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.authUser) {
      next(new HttpError(401, "Usuário não autenticado."));
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.authUser.role)) {
      next(new HttpError(403, "Você não tem permissão para esta ação."));
      return;
    }

    next();
  };

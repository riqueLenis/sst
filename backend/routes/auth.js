import { Router } from "express";
import { authSchemas } from "../lib/schemas.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validateBody } from "../middlewares/validate-body.js";

const handle = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export const createAuthRouter = (authService) => {
  const router = Router();

  router.post(
    "/login",
    validateBody(authSchemas.login),
    handle(async (req, res) => {
      const session = await authService.login(req.validatedBody);

      res.json({
        data: session,
        meta: {
          message: "Autenticação realizada com sucesso.",
        },
      });
    }),
  );

  router.get(
    "/me",
    authenticate(authService),
    handle(async (req, res) => {
      res.json({
        data: req.authUser,
      });
    }),
  );

  router.post(
    "/logout",
    authenticate(authService),
    handle(async (_req, res) => {
      res.json({
        data: null,
        meta: {
          message: "Sessão encerrada.",
        },
      });
    }),
  );

  return router;
};
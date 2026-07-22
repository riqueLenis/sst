import { Router } from "express";
import { clearAuthCookie, setAuthCookie } from "../lib/auth-cookie.js";
import { authSchemas } from "../lib/schemas.js";
import { authenticate, authorize } from "../middlewares/authenticate.js";
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
      setAuthCookie(res, session.token);

      res.json({
        data: {
          user: session.user,
        },
        meta: {
          message: "Autenticação realizada com sucesso.",
        },
      });
    }),
  );

  router.get(
    "/users",
    authenticate(authService),
    authorize("admin"),
    handle(async (_req, res) => {
      res.json({
        data: await authService.listUsers(),
      });
    }),
  );

  router.post(
    "/users",
    authenticate(authService),
    authorize("admin"),
    validateBody(authSchemas.createUser),
    handle(async (req, res) => {
      const createdUser = await authService.createUser(req.validatedBody);

      res.status(201).json({
        data: createdUser,
        meta: {
          message: "Usuário criado com sucesso.",
        },
      });
    }),
  );

  router.patch(
    "/users/:id",
    authenticate(authService),
    authorize("admin"),
    validateBody(authSchemas.updateUser, { requireAtLeastOne: true }),
    handle(async (req, res) => {
      const updatedUser = await authService.updateUser(
        req.params.id,
        req.validatedBody,
        req.authUser.id,
      );

      res.json({
        data: updatedUser,
        meta: {
          message: "Usuário atualizado com sucesso.",
        },
      });
    }),
  );

  router.delete(
    "/users/:id",
    authenticate(authService),
    authorize("admin"),
    handle(async (req, res) => {
      const removedUser = await authService.deleteUser(
        req.params.id,
        req.authUser.id,
      );

      res.json({
        data: removedUser,
        meta: {
          message: "Usuário removido com sucesso.",
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
    handle(async (req, res) => {
      if (req.authToken) {
        await authService.logout(req.authToken);
      }

      clearAuthCookie(res);

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
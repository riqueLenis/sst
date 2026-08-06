import { Router } from "express";
import { z } from "zod";
import { authorize } from "../middlewares/authenticate.js";
import { validateBody } from "../middlewares/validate-body.js";

const handle = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const lookupSchema = z
  .object({
    numbers: z
      .array(z.union([z.string(), z.number()]))
      .max(500, "Envie no máximo 500 CAs por consulta."),
  })
  .strict();

export const createCaepiRouter = (caepiService) => {
  const router = Router();

  router.get(
    "/status",
    handle(async (_req, res) => {
      res.json({ data: await caepiService.getStatus() });
    }),
  );

  router.post(
    "/lookup",
    validateBody(lookupSchema),
    handle(async (req, res) => {
      res.json({
        data: await caepiService.findManyByNumber(req.validatedBody.numbers),
      });
    }),
  );

  router.post(
    "/sync",
    authorize("admin", "manager"),
    handle(async (_req, res) => {
      const result = await caepiService.sync({ force: true });

      res.json({
        data: result,
        meta: {
          message: result.skipped
            ? "A base do CAEPI já estava atualizada."
            : `Base do CAEPI atualizada com ${result.records} certificados.`,
        },
      });
    }),
  );

  router.get(
    "/:numero",
    handle(async (req, res) => {
      const record = await caepiService.findByNumber(req.params.numero);

      if (!record) {
        const status = await caepiService.getStatus();
        const message =
          status.total === 0
            ? "A base do CAEPI ainda não foi importada neste servidor. Use \"Atualizar base\" no Estoque de EPIs."
            : status.partial
              ? "CA não localizado na cópia disponível da base oficial. O arquivo publicado pelo MTE está incompleto hoje, então este CA pode existir — confirme em caepi.trabalho.gov.br."
              : "CA não encontrado na base do Ministério do Trabalho. Confira o número informado.";

        res.status(404).json({
          error: {
            message,
            details: {
              baseTotal: status.total,
              basePartial: status.partial,
              baseAtualizadaEm: status.lastSyncAt,
            },
            requestId: req.requestId,
          },
        });
        return;
      }

      res.json({ data: record });
    }),
  );

  return router;
};

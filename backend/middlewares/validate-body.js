import { HttpError } from "../lib/http-error.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const validateBody = (schema, options = {}) => {
  const { requireAtLeastOne = false } = options;

  return (req, _res, next) => {
    try {
      let parsedBody = schema.parse(req.body ?? {});

      // Em atualizações parciais (PATCH), o zod injeta os valores `.default()`
      // dos campos ausentes. Isso sobrescreveria dados existentes com valores
      // padrão. Para evitar, mantemos apenas os campos realmente enviados.
      if (requireAtLeastOne && isPlainObject(parsedBody)) {
        const sentKeys = isPlainObject(req.body) ? Object.keys(req.body) : [];
        parsedBody = Object.fromEntries(
          Object.entries(parsedBody).filter(([key]) => sentKeys.includes(key)),
        );

        if (Object.keys(parsedBody).length === 0) {
          throw new HttpError(
            400,
            "Envie ao menos um campo para atualização do recurso.",
          );
        }
      }

      req.validatedBody = parsedBody;
      next();
    } catch (error) {
      next(error);
    }
  };
};

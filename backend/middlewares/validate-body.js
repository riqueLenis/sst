import { HttpError } from "../lib/http-error.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const validateBody = (schema, options = {}) => {
  const { requireAtLeastOne = false } = options;

  return (req, _res, next) => {
    try {
      const parsedBody = schema.parse(req.body ?? {});

      if (
        requireAtLeastOne &&
        isPlainObject(parsedBody) &&
        Object.keys(parsedBody).length === 0
      ) {
        throw new HttpError(
          400,
          "Envie ao menos um campo para atualização do recurso.",
        );
      }

      req.validatedBody = parsedBody;
      next();
    } catch (error) {
      next(error);
    }
  };
};

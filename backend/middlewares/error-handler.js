import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";

const formatIssues = (issues) =>
  issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

export const notFoundHandler = (req, _res, next) => {
  next(
    new HttpError(404, `Rota ${req.method} ${req.originalUrl} não encontrada.`),
  );
};

export const errorHandler = (error, req, res, _next) => {
  let statusCode = 500;
  let message = "Erro interno do servidor.";
  let details;

  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Falha de validação da requisição.";
    details = formatIssues(error.issues);
  } else if (error instanceof HttpError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof SyntaxError && isBodySyntaxError(error)) {
    statusCode = 400;
    message = "JSON inválido no corpo da requisição.";
  }

  if (statusCode >= 500) {
    console.error(`[${req.requestId}]`, error);
  }

  res.status(statusCode).json({
    error: {
      message,
      details,
      requestId: req.requestId,
    },
  });
};

function isBodySyntaxError(error) {
  return "body" in error && error.status === 400;
}

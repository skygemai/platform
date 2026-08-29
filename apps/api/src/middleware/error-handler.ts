import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "Invalid request", details: error.flatten() });
    return;
  }

  const requestId = response.getHeader("x-request-id");
  console.error("Unhandled API error", { requestId, method: request.method, path: request.path, error });
  response.status(500).json({ error: "Internal server error", requestId });
};

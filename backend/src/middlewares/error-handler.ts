import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@/errors/app-error";
import { sendError } from "@/types/api-response";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }

  if (err instanceof ZodError) {
    const readable = fromZodError(err);
    sendError(res, readable.message, "VALIDATION_ERROR", StatusCodes.UNPROCESSABLE_ENTITY);
    return;
  }

  console.error(err);
  sendError(res, "Internal server error", "INTERNAL_ERROR", StatusCodes.INTERNAL_SERVER_ERROR);
};

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];

    return res.status(400).json({
      message: firstIssue?.message ?? "Validation failed.",
      issues: error.flatten(),
    });
  }

  if (error instanceof Error) {
    console.error(error);

    return res.status(500).json({
      message: env.NODE_ENV === "production" ? "Something went wrong on the server." : error.message,
    });
  }

  console.error(error);

  return res.status(500).json({
    message: env.NODE_ENV === "production" ? "Something went wrong on the server." : "Unexpected server error.",
  });
}

import type { Request, Response } from "express";

interface ApiResponseOptions<T> {
  req: Request;
  res: Response;

  statusCode?: number;
  success?: boolean;
  message?: string;

  data?: T;
  errors?: unknown;

  cached?: boolean;
}

export const apiResponse = <T>({
  req,
  res,

  statusCode = 200,
  success = true,
  message = "Success",

  data,
  errors,
  cached,
}: ApiResponseOptions<T>) => {
  return res.status(statusCode).json({
    success,
    message,

    ...(data !== undefined ? { data } : {}),

    ...(errors ? { errors } : {}),

    meta: {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      ...(cached !== undefined ? { cached } : {}),
    },
  });
};

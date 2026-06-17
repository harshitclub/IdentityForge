import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
};

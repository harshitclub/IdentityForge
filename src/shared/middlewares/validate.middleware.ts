import type { Request, Response, NextFunction } from "express";
import type { ZodObject } from "zod";

/**
 * ============================================================================
 * Zod Request Validation Middleware Factory
 * ============================================================================
 * Higher-order middleware that validates and transforms incoming `req.body`
 * against a specified Zod schema. Passes any validation errors down to the
 * global error handling middleware.
 *
 * @param schema - ZodObject validation schema
 * @returns Express request handler middleware
 */
export const validate = (schema: ZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedData = await schema.parseAsync(req.body);

      // Replace req.body with sanitized & parsed schema data
      req.body = parsedData;

      next();
    } catch (error) {
      next(error);
    }
  };
};

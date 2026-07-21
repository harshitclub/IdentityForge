import type { NextFunction, Request, Response } from "express";

import { logger } from "../logging/logger.js";
import { runRequestContext } from "./request-context.js";

export const requestContextMiddleware = (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  const childLogger = logger.child({
    requestId: req.requestId,
  });

  runRequestContext(
    {
      requestId: req.requestId,
      logger: childLogger,
    },
    next,
  );
};

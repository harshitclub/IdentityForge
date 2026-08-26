import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../constants/index.js";
import { prisma } from "../../config/prisma.js";

/**
 * ============================================================================
 * Admin Role Authorization Middleware
 * ============================================================================
 * Enforces Role-Based Access Control (RBAC) ensuring that the authenticated
 * user has an active ADMIN role in the database.
 * Must be mounted AFTER `authenticateUser` middleware in the route chain.
 *
 * @throws AppError (404) if user record no longer exists
 * @throws AppError (403) if user role is not ADMIN
 */
export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.user;

  // Step 1: Query user's current role from database
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      role: true,
    },
  });

  if (!user) {
    throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // Step 2: Validate ADMIN role
  if (user.role !== "ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  next();
}

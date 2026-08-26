import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../constants/index.js";
import { verifyAccessToken } from "../utils/auth/accessToken.js";
import { prisma } from "../../config/prisma.js";

/**
 * ============================================================================
 * User Authentication Middleware
 * ============================================================================
 * Authenticates incoming requests using the `if_accessToken` HTTP-only cookie.
 * Verifies JWT cryptographic signature and verifies live account status
 * (`DELETED`, `SUSPENDED`, `BANNED`, or `LOCKED`) in the database before attaching
 * user identity to `req.user`.
 *
 * @throws AppError (401) if access token cookie is missing or signature is invalid
 * @throws AppError (403) if account is deleted, suspended, banned, or locked
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Step 1: Extract access token cookie
  const { if_accessToken: accessToken } = req.cookies;
  if (!accessToken) {
    throw new AppError(
      ERROR_MESSAGES.ACCESS_TOKEN_INVALID,
      HTTP_STATUS.UNAUTHORIZED,
    );
  }

  // Step 2: Verify JWT signature & expiration timestamp
  const tokenPayload = verifyAccessToken(accessToken);

  // Step 3: Fetch latest user status and lock state from database
  const user = await prisma.user.findUnique({
    where: { id: tokenPayload.id },
    select: {
      id: true,
      role: true,
      lockUntil: true,
      status: true,
    },
  });

  if (!user) {
    throw new AppError(
      ERROR_MESSAGES.ACCESS_TOKEN_INVALID,
      HTTP_STATUS.UNAUTHORIZED,
    );
  }

  // Step 4: Enforce account lifecycle and lockout constraints
  if (user.status === "DELETED") {
    throw new AppError(ERROR_MESSAGES.ACCOUNT_DELETED, HTTP_STATUS.FORBIDDEN);
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(ERROR_MESSAGES.ACCOUNT_SUSPENDED, HTTP_STATUS.FORBIDDEN);
  }

  if (user.status === "BANNED") {
    throw new AppError(ERROR_MESSAGES.ACCOUNT_BANNED, HTTP_STATUS.FORBIDDEN);
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError(ERROR_MESSAGES.ACCOUNT_LOCKED, HTTP_STATUS.FORBIDDEN);
  }

  // Step 5: Attach authenticated user identity to Express Request
  req.user = {
    id: user.id,
  };

  next();
}

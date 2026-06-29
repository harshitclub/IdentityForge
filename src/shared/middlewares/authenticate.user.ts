import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../constants/index.js";
import { verifyAccessToken } from "../utils/auth/accessToken.js";
import { prisma } from "../../config/prisma.js";

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { if_accessToken: accessToken } = req.cookies;
  if (!accessToken) {
    throw new AppError(
      ERROR_MESSAGES.ACCESS_TOKEN_INVALID,
      HTTP_STATUS.UNAUTHORIZED,
    );
  }

  // Verify JWT signature & expiration
  const tokenPayload = verifyAccessToken(accessToken);

  const user = await prisma.user.findUnique({
    where: { id: tokenPayload.id },
    select: {
      id: true,
      role: true,
      lockUntil: true,
    },
  });

  if (!user) {
    throw new AppError(
      ERROR_MESSAGES.ACCESS_TOKEN_INVALID,
      HTTP_STATUS.UNAUTHORIZED,
    );
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError(ERROR_MESSAGES.ACCOUNT_LOCKED, HTTP_STATUS.FORBIDDEN);
  }

  req.user = {
    id: user.id,
  };

  next();
}

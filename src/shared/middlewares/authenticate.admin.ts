import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../constants/index.js";
import { verifyAccessToken } from "../utils/auth/accessToken.js";
import { prisma } from "../../config/prisma.js";

export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.user;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      role: true,
    },
  });

  if (!user) {
    throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (user.role !== "ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  next();
}

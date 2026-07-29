import jwt, { type JwtPayload } from "jsonwebtoken";

import { AppError } from "../appError.js";
import type { UserRole } from "../../../generated/prisma/enums.js";
import { env } from "../../../config/env.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../../constants/index.js";
import { getRequestLogger } from "../../request-context/request-context.js";

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
};

export const verifyAccessToken = (
  token: string,
): JwtPayload & AccessTokenPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload &
      AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      const logger = getRequestLogger();
      logger.warn({
        event: LOG_EVENTS.ACCESS_TOKEN_EXPIRED,
      });

      throw new AppError(
        ERROR_MESSAGES.ACCESS_TOKEN_EXPIRED,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.NotBeforeError
    ) {
      const logger = getRequestLogger();
      logger.warn({
        event: LOG_EVENTS.ACCESS_TOKEN_INVALID,
      });

      throw new AppError(
        ERROR_MESSAGES.ACCESS_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }
    const logger = getRequestLogger();
    logger.error({
      event: LOG_EVENTS.UNAUTHORIZED_ACCESS,
      error,
    });
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
};

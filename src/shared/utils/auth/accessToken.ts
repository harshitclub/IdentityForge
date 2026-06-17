import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
  type JwtPayload,
} from "jsonwebtoken";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../appError.js";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../constants/index.js";
import { createLogContext } from "../loggerContext.js";

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
    if (error instanceof TokenExpiredError) {
      logger.warn(
        createLogContext(LOG_EVENTS.ACCESS_TOKEN_EXPIRED, {
          operation: "verifyAccessToken",
          expiredAt: error.expiredAt.toISOString(),
        }),
      );

      throw new AppError(
        ERROR_MESSAGES.TOKEN_EXPIRED,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      logger.warn(
        createLogContext(LOG_EVENTS.ACCESS_TOKEN_INVALID, {
          operation: "verifyAccessToken",
          reason: error.message,
        }),
      );

      throw new AppError(
        ERROR_MESSAGES.INVALID_TOKEN,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    logger.error(
      createLogContext(LOG_EVENTS.ACCESS_TOKEN_VERIFICATION_ERROR, {
        operation: "verifyAccessToken",
        error,
      }),
    );
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
};

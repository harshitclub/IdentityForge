import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
  type JwtPayload,
} from "jsonwebtoken";

import { AppError } from "../appError.js";
import type { UserRole } from "../../../generated/prisma/enums.js";
import { env } from "../../../config/env.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../../constants/index.js";
import { logger } from "../../../config/logger.js";

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
      logger.warn(ERROR_MESSAGES.ACCESS_TOKEN_EXPIRED);

      throw new AppError(
        ERROR_MESSAGES.ACCESS_TOKEN_EXPIRED,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      logger.warn(ERROR_MESSAGES.ACCESS_TOKEN_INVALID);

      throw new AppError(
        ERROR_MESSAGES.ACCESS_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    logger.error(ERROR_MESSAGES.UNAUTHORIZED);
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
};

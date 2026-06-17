import crypto from "crypto";
import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
  type JwtPayload,
} from "jsonwebtoken";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { createLogContext } from "../loggerContext.js";
import { LOG_EVENTS } from "../../constants/index.js";

export interface RefreshTokenPayload {
  id: string;
}
export const generateRefreshTokenWithJti = (
  payload: RefreshTokenPayload,
): { token: string; jti: string } => {
  // Safe UUID generation across Node versions
  const jti =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");

  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    jwtid: jti,
  });

  return { token, jti };
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      logger.warn(
        createLogContext(LOG_EVENTS.REFRESH_TOKEN_EXPIRED, {
          operation: "verifyRefreshToken",
          expiredAt: error.expiredAt.toISOString(),
        }),
      );

      throw error;
    }

    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      logger.warn(
        createLogContext(LOG_EVENTS.REFRESH_TOKEN_INVALID, {
          operation: "verifyRefreshToken",
          reason: error.message,
        }),
      );

      throw error;
    }

    logger.error(
      createLogContext(LOG_EVENTS.REFRESH_TOKEN_VERIFICATION_ERROR, {
        operation: "verifyRefreshToken",
        error,
      }),
    );

    throw error;
  }
};

export const decodeRefreshToken = (token: string) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error(
      createLogContext(LOG_EVENTS.REFRESH_TOKEN_DECODE_FAILED, {
        operation: "decodeRefreshToken",
        error,
      }),
    );

    return null;
  }
};

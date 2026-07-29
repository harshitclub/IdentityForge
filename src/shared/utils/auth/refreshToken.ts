import crypto from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../../../config/env.js";
import { ERROR_MESSAGES, LOG_EVENTS } from "../../../constants/index.js";
import { getRequestLogger } from "../../request-context/request-context.js";

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
    if (error instanceof jwt.TokenExpiredError) {
      const logger = getRequestLogger();
      logger.warn({
        event: LOG_EVENTS.REFRESH_TOKEN_EXPIRED,
      });

      throw error;
    }

    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.NotBeforeError
    ) {
      const logger = getRequestLogger();
      logger.warn({
        event: LOG_EVENTS.REFRESH_TOKEN_INVALID,
      });

      throw error;
    }
    const logger = getRequestLogger();
    logger.error({
      event: LOG_EVENTS.REFRESH_TOKEN_VERIFICATION_ERROR,
      error,
    });

    throw error;
  }
};

export const decodeRefreshToken = (token: string) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    const logger = getRequestLogger();
    logger.error({
      event: LOG_EVENTS.REFRESH_TOKEN_DECODE_FAILED,
      error,
    });

    return null;
  }
};

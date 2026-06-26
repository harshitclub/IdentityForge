import crypto from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { ERROR_MESSAGES } from "../../../constants/index.js";

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
      logger.warn(ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED);

      throw error;
    }

    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.NotBeforeError
    ) {
      logger.warn(ERROR_MESSAGES.REFRESH_TOKEN_INVALID);

      throw error;
    }

    logger.error(`Refresh Token Verification Error`);

    throw error;
  }
};

export const decodeRefreshToken = (token: string) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error(`Refresh Token Decode Failed`);

    return null;
  }
};

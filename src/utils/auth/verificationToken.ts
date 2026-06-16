import crypto from "crypto";

export function generateVerificationTokenRaw(ttlMinutes = 15) {
  const raw = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  return { raw, expiresAt };
}

export function timingSafeMatch(rawToken: string, storedHexHash: string) {
  const a = crypto.createHash("sha256").update(rawToken).digest();
  const b = Buffer.from(storedHexHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

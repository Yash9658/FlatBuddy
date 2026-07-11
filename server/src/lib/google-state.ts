import { UserRole } from "@prisma/client";
import crypto from "node:crypto";
import { env } from "../config/env.js";

type GoogleOAuthState = {
  role: UserRole;
  nonce: string;
  expiresAt: number;
};

const stateTtlMs = 10 * 60 * 1000;

function signState(payload: string) {
  return crypto.createHmac("sha256", env.JWT_REFRESH_SECRET).update(payload).digest("base64url");
}

export function createGoogleOAuthState(role: UserRole) {
  const payload = Buffer.from(
    JSON.stringify({
      role,
      nonce: crypto.randomBytes(16).toString("base64url"),
      expiresAt: Date.now() + stateTtlMs,
    } satisfies GoogleOAuthState),
  ).toString("base64url");

  return `${payload}.${signState(payload)}`;
}

export function parseGoogleOAuthState(state: unknown) {
  if (typeof state !== "string") {
    return null;
  }

  const [payload, signature] = state.split(".");

  if (!payload || !signature || signature.length !== signState(payload).length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(signState(payload)))) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleOAuthState;

    if (
      decoded.expiresAt < Date.now() ||
      (decoded.role !== UserRole.TENANT && decoded.role !== UserRole.LANDLORD)
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

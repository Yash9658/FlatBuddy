import crypto from "node:crypto";
import { env } from "../config/env.js";
import { hashToken } from "./jwt.js";
import { prisma } from "./prisma.js";

const verificationTokenTtlMs = 1000 * 60 * 60;

export function createVerificationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function buildVerificationUrl(token: string) {
  const url = new URL("/verify-email", env.CLIENT_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function createEmailVerificationToken(userId: string) {
  await prisma.emailVerificationToken.updateMany({
    where: {
      userId,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      usedAt: new Date(),
    },
  });

  const token = createVerificationToken();

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + verificationTokenTtlMs),
    },
  });

  return token;
}

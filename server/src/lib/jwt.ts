import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type TokenPayload = {
  sub: string;
  role: string;
};

const accessTokenOptions: jwt.SignOptions = {
  expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
};

const refreshTokenOptions: jwt.SignOptions = {
  expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"],
};

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, accessTokenOptions);
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshTokenOptions);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

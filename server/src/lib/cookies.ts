import type { CookieOptions } from "express";
import { env } from "../config/env.js";

export const refreshCookieName = "flatbuddy_refresh";

export function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: "/api/auth",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}

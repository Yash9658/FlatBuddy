import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { Request } from "express";
import { env } from "../config/env.js";

export const uploadsRoot = fileURLToPath(new URL("../../uploads", import.meta.url));

fs.mkdirSync(uploadsRoot, { recursive: true });

export function getUploadsBaseUrl(req: Request) {
  const configuredBaseUrl = env.PUBLIC_SERVER_URL?.trim().replace(/\/+$/, "");

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return `${req.protocol}://${req.get("host")}`;
}

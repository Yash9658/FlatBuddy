import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const uploadsRoot = fileURLToPath(new URL("../../uploads", import.meta.url));

fs.mkdirSync(uploadsRoot, { recursive: true });

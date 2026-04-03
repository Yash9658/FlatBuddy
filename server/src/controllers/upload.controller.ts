import type { Request, Response } from "express";
import multer from "multer";
import { UserRole } from "@prisma/client";
import { getUploadsBaseUrl, uploadsRoot } from "../lib/uploads.js";

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsRoot);
  },
  filename: (_req, file, callback) => {
    const safeBaseName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${Date.now()}-${safeBaseName}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image uploads are allowed."));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export async function uploadImage(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.auth.role !== UserRole.LANDLORD && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only landlords can upload listing images." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Image file is required." });
  }

  return res.status(201).json({
    url: `${getUploadsBaseUrl(req)}/uploads/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
  });
}

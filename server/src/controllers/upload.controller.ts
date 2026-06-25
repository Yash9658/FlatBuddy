import type { Request, Response } from "express";
import multer from "multer";
import { UserRole } from "@prisma/client";
import { isCloudinaryConfigured, uploadListingImage } from "../lib/cloudinary.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
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

  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ message: "Cloud image storage is not configured." });
  }

  const detectedImage = detectImageType(req.file.buffer);

  if (!detectedImage) {
    return res.status(400).json({ message: "Only valid JPEG, PNG, and WebP images are allowed." });
  }

  const uploadedImage = await uploadListingImage(req.file.buffer);

  return res.status(201).json({
    url: uploadedImage.secure_url,
    filename: uploadedImage.public_id,
    originalName: req.file.originalname,
    size: uploadedImage.bytes,
  });
}

function detectImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: "png", mimeType: "image/png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }

  return null;
}

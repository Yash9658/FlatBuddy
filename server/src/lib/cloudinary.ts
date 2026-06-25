import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env.js";

export function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
}

function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function uploadListingImage(buffer: Buffer) {
  configureCloudinary();

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_FOLDER,
        resource_type: "image",
        unique_filename: true,
        overwrite: false,
        transformation: [
          {
            width: 2000,
            height: 2000,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary did not return an upload result."));
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

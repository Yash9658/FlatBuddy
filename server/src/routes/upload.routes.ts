import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload, uploadImage } from "../controllers/upload.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createRateLimit } from "../middleware/rate-limit.js";

const router = Router();
const uploadLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  keyPrefix: "upload",
});

router.post("/image", requireAuth, uploadLimiter, upload.single("image"), asyncHandler(uploadImage));

export default router;

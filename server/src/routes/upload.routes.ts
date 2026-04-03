import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload, uploadImage } from "../controllers/upload.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.post("/image", requireAuth, upload.single("image"), asyncHandler(uploadImage));

export default router;

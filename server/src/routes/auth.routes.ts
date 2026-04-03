import { Router } from "express";
import {
  getAuthConfig,
  getMe,
  googleAuth,
  googleCallback,
  login,
  logout,
  refreshSession,
  register,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { createRateLimit } from "../middleware/rate-limit.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
const authWriteLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: "auth-write",
});

router.post("/register", authWriteLimiter, asyncHandler(register));
router.post("/login", authWriteLimiter, asyncHandler(login));
router.post("/refresh", authWriteLimiter, asyncHandler(refreshSession));
router.post("/logout", authWriteLimiter, asyncHandler(logout));
router.get("/config", asyncHandler(getAuthConfig));
router.get("/me", requireAuth, asyncHandler(getMe));
router.get("/google", googleAuth);
router.get("/google/callback", ...googleCallback);

export default router;

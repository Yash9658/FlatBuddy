import { Router } from "express";
import {
  getUserProfileDetail,
  requestLandlordVerification,
  updateRoleSelection,
  updatePreference,
  updateProfile,
} from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/users/:id", requireAuth, asyncHandler(getUserProfileDetail));
router.post("/verification", requireAuth, asyncHandler(requestLandlordVerification));
router.put("/role", requireAuth, asyncHandler(updateRoleSelection));
router.put("/", requireAuth, asyncHandler(updateProfile));
router.put("/preferences", requireAuth, asyncHandler(updatePreference));

export default router;

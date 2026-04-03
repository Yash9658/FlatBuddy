import { Router } from "express";
import {
  listSavedProperties,
  listSavedUsers,
  removeSavedProperty,
  removeSavedUser,
  saveProperty,
  saveUser,
} from "../controllers/saved.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/users", requireAuth, asyncHandler(listSavedUsers));
router.post("/users", requireAuth, asyncHandler(saveUser));
router.delete("/users/:targetUserId", requireAuth, asyncHandler(removeSavedUser));

router.get("/properties", requireAuth, asyncHandler(listSavedProperties));
router.post("/properties", requireAuth, asyncHandler(saveProperty));
router.delete("/properties/:propertyId", requireAuth, asyncHandler(removeSavedProperty));

export default router;

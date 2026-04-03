import { Router } from "express";
import {
  createProperty,
  getLandlordAnalytics,
  getPropertyById,
  listMyProperties,
  listProperties,
} from "../controllers/property.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", asyncHandler(listProperties));
router.get("/analytics", requireAuth, asyncHandler(getLandlordAnalytics));
router.get("/mine", requireAuth, asyncHandler(listMyProperties));
router.get("/:id", asyncHandler(getPropertyById));
router.post("/", requireAuth, asyncHandler(createProperty));

export default router;

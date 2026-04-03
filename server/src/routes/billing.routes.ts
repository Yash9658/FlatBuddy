import { Router } from "express";
import {
  createCheckoutSession,
  createPortalSession,
  listPlans,
  updateSubscriptionCancellation,
} from "../controllers/billing.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/plans", listPlans);
router.post("/checkout-session", requireAuth, asyncHandler(createCheckoutSession));
router.post("/portal-session", requireAuth, asyncHandler(createPortalSession));
router.patch("/subscription", requireAuth, asyncHandler(updateSubscriptionCancellation));

export default router;

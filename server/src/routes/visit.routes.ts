import { Router } from "express";
import { createVisitRequest, listVisits, updateVisitRequest } from "../controllers/visit.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listVisits));
router.post("/", requireAuth, asyncHandler(createVisitRequest));
router.patch("/:id", requireAuth, asyncHandler(updateVisitRequest));

export default router;

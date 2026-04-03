import { Router } from "express";
import { listPotentialMatches } from "../controllers/match.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listPotentialMatches));

export default router;

import { Router } from "express";
import {
  createConnection,
  listConnections,
  updateConnection,
} from "../controllers/connection.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listConnections));
router.post("/", requireAuth, asyncHandler(createConnection));
router.patch("/:id", requireAuth, asyncHandler(updateConnection));

export default router;

import { Router } from "express";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(getNotifications));
router.post("/read-all", requireAuth, asyncHandler(markAllNotificationsRead));
router.post("/:key/read", requireAuth, asyncHandler(markNotificationRead));

export default router;

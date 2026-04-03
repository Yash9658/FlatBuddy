import { Router } from "express";
import { createMessage, listChats, listMessages } from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listChats));
router.get("/:chatId/messages", requireAuth, asyncHandler(listMessages));
router.post("/:chatId/messages", requireAuth, asyncHandler(createMessage));

export default router;

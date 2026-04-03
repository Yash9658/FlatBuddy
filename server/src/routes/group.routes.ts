import { Router } from "express";
import {
  addGroupShortlist,
  createGroup,
  deleteGroup,
  getGroupById,
  inviteGroupMember,
  leaveGroup,
  listGroupInvitations,
  listGroups,
  removeGroupShortlist,
  respondToGroupInvitation,
  updateGroupPlan,
} from "../controllers/group.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listGroups));
router.post("/", requireAuth, asyncHandler(createGroup));
router.get("/invitations", requireAuth, asyncHandler(listGroupInvitations));
router.post("/invitations/:invitationId/respond", requireAuth, asyncHandler(respondToGroupInvitation));
router.get("/:id", requireAuth, asyncHandler(getGroupById));
router.patch("/:id", requireAuth, asyncHandler(updateGroupPlan));
router.post("/:id/members", requireAuth, asyncHandler(inviteGroupMember));
router.delete("/:id/members/me", requireAuth, asyncHandler(leaveGroup));
router.delete("/:id", requireAuth, asyncHandler(deleteGroup));
router.post("/:id/shortlists", requireAuth, asyncHandler(addGroupShortlist));
router.delete("/:id/shortlists/:propertyId", requireAuth, asyncHandler(removeGroupShortlist));

export default router;

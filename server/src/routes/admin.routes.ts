import { UserRole } from "@prisma/client";
import { Router } from "express";
import {
  getAdminListings,
  getAdminOverview,
  getAdminReports,
  getAdminUsers,
  updateAdminVerification,
  updateAdminListing,
  updateAdminReport,
  updateAdminUserStatus,
} from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/overview", requireAuth, requireRole(UserRole.ADMIN), asyncHandler(getAdminOverview));
router.get("/reports", requireAuth, requireRole(UserRole.ADMIN), asyncHandler(getAdminReports));
router.get("/listings", requireAuth, requireRole(UserRole.ADMIN), asyncHandler(getAdminListings));
router.get("/users", requireAuth, requireRole(UserRole.ADMIN), asyncHandler(getAdminUsers));
router.patch("/reports/:id", requireAuth, requireRole(UserRole.ADMIN), asyncHandler(updateAdminReport));
router.patch("/listings/:id", requireAuth, requireRole(UserRole.ADMIN), asyncHandler(updateAdminListing));
router.patch("/users/:id", requireAuth, requireRole(UserRole.ADMIN), asyncHandler(updateAdminUserStatus));
router.patch("/users/:id/verification", requireAuth, requireRole(UserRole.ADMIN), asyncHandler(updateAdminVerification));

export default router;

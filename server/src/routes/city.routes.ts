import { Router } from "express";
import { getCityOverview, listCities } from "../controllers/city.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", asyncHandler(listCities));
router.get("/:slug", asyncHandler(getCityOverview));

export default router;

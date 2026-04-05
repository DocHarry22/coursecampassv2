import express from "express";
import { getDashboardContract, getHealth, getMetrics, getReadiness, getSummary } from "../controllers/general.js";
import { authenticateAccessToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();
const requireSuperadmin = requireRoles("superadmin");

router.get("/", authenticateAccessToken, getSummary);
router.get("/health", getHealth);
router.get("/ready", getReadiness);
router.get("/dashboard-contract", authenticateAccessToken, getDashboardContract);
router.get("/metrics", authenticateAccessToken, requireSuperadmin, getMetrics);
router.get("/summary", authenticateAccessToken, getSummary);

export default router;
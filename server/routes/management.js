import express from "express";
import { getDashboardMetrics, getTransactions } from "../controllers/management.js";
import { authenticateAccessToken, requireRoles } from "../middleware/auth.js";
import { validateTransactionsQuery } from "../middleware/validation.js";

const router = express.Router();
const requireAdmin = requireRoles("admin", "superadmin");
router.use(authenticateAccessToken, requireAdmin);

router.get("/dashboard", getDashboardMetrics);
router.get("/transactions", validateTransactionsQuery, getTransactions);

export default router;
import express from "express";
import { getSalesOverview } from "../controllers/sales.js";
import { authenticateAccessToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();
const requireAdmin = requireRoles("admin", "superadmin");
router.use(authenticateAccessToken, requireAdmin);

router.get("/overview", getSalesOverview);

export default router;
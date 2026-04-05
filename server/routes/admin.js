import express from "express";
import {
  getAdminObservabilityMetrics,
  getAuditEvents,
  getUserDetails,
  listUsers,
  revokeAllSessionsByAdmin,
  revokeUserSessionsByAdmin,
  updateUserAccountStatus,
  updateUserRole,
} from "../controllers/admin.js";
import { authenticateAccessToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();
const requireSuperadmin = requireRoles("superadmin");

router.use(authenticateAccessToken, requireSuperadmin);

router.get("/users", listUsers);
router.get("/users/:id", getUserDetails);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/status", updateUserAccountStatus);
router.post("/users/:id/revoke-sessions", revokeUserSessionsByAdmin);
router.post("/sessions/revoke-all", revokeAllSessionsByAdmin);
router.get("/audit/events", getAuditEvents);
router.get("/observability/metrics", getAdminObservabilityMetrics);

export default router;

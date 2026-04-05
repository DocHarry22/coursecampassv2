import express from "express";
import {
  createSchool,
  deleteSchool,
  getSchoolById,
  listSchools,
  updateSchool,
} from "../controllers/schools.js";
import { authenticateAccessToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();
const requireAdmin = requireRoles("admin", "superadmin");
const requireSuperadmin = requireRoles("superadmin");
router.use(authenticateAccessToken);

router.get("/", listSchools);
router.post("/", requireAdmin, createSchool);
router.get("/:id", getSchoolById);
router.patch("/:id", requireAdmin, updateSchool);
router.delete("/:id", requireSuperadmin, deleteSchool);

export default router;

import express from "express";
import {
  createCourse,
  deleteCourse,
  getCourseById,
  listCourses,
  updateCourse,
} from "../controllers/courses.js";
import { authenticateAccessToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();
const requireAdmin = requireRoles("admin", "superadmin");
const requireSuperadmin = requireRoles("superadmin");
router.use(authenticateAccessToken);

router.get("/", listCourses);
router.post("/", requireAdmin, createCourse);
router.get("/:id", getCourseById);
router.patch("/:id", requireAdmin, updateCourse);
router.delete("/:id", requireSuperadmin, deleteCourse);

export default router;

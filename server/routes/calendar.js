import express from "express";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  listCalendarEvents,
  updateCalendarEvent,
} from "../controllers/calendar.js";
import { authenticateAccessToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateAccessToken);

router.get("/", listCalendarEvents);
router.post("/", createCalendarEvent);
router.get("/:id", getCalendarEventById);
router.patch("/:id", updateCalendarEvent);
router.delete("/:id", deleteCalendarEvent);

export default router;

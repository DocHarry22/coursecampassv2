import express from "express";
import { getHealth, getSummary } from "../controllers/general.js";

const router = express.Router();

router.get("/", getSummary);
router.get("/health", getHealth);
router.get("/summary", getSummary);

export default router;
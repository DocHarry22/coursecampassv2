import express from "express";
import { getDashboardMetrics, getTransactions } from "../controllers/management.js";

const router = express.Router();

router.get("/dashboard", getDashboardMetrics);
router.get("/transactions", getTransactions);

export default router;
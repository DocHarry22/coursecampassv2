import express from "express";
import { getSalesOverview } from "../controllers/sales.js";

const router = express.Router();

router.get("/overview", getSalesOverview);

export default router;
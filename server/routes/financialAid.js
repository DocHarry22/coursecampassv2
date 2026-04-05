import express from "express";
import {
  createFinancialAid,
  deleteFinancialAid,
  getFinancialAidById,
  listFinancialAid,
  updateFinancialAid,
} from "../controllers/financialAid.js";
import { authenticateAccessToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateAccessToken);

router.get("/", listFinancialAid);
router.post("/", createFinancialAid);
router.get("/:id", getFinancialAidById);
router.patch("/:id", updateFinancialAid);
router.delete("/:id", deleteFinancialAid);

export default router;

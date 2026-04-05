import express from "express";
import {
  getAccountProfile,
  updateAccountPassword,
  updateAccountProfile,
} from "../controllers/account.js";
import { authenticateAccessToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateAccessToken);

router.get("/profile", getAccountProfile);
router.patch("/profile", updateAccountProfile);
router.patch("/password", updateAccountPassword);

export default router;

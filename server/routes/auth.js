import express from "express";
import { login, logout, me, refresh } from "../controllers/auth.js";
import { authenticateAccessToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticateAccessToken, me);

export default router;

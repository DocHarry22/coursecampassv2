import express from "express";
import { getCustomers, getProducts } from "../controllers/client.js";

const router = express.Router();

router.get("/customers", getCustomers);
router.get("/products", getProducts);

export default router;
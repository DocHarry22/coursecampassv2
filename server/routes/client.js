import express from "express";
import { getCustomers, getProducts } from "../controllers/client.js";
import { authenticateAccessToken, requireRoles } from "../middleware/auth.js";
import { validateCustomersQuery, validateProductsQuery } from "../middleware/validation.js";

const router = express.Router();
const requireAdmin = requireRoles("admin", "superadmin");
router.use(authenticateAccessToken, requireAdmin);

router.get("/customers", validateCustomersQuery, getCustomers);
router.get("/products", validateProductsQuery, getProducts);

export default router;
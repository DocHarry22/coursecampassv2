import express from "express";
import {
  createTodo,
  deleteTodo,
  getTodoById,
  listTodos,
  updateTodo,
} from "../controllers/todos.js";
import { authenticateAccessToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateAccessToken);

router.get("/", listTodos);
router.post("/", createTodo);
router.get("/:id", getTodoById);
router.patch("/:id", updateTodo);
router.delete("/:id", deleteTodo);

export default router;

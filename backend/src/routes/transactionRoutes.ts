import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "../controllers/transactionController";
import { requireAuth } from "../middleware/auth";

export const transactionRouter = Router();

transactionRouter.use(requireAuth);
transactionRouter.post("/", createTransaction);
transactionRouter.get("/", listTransactions);
transactionRouter.get("/:id", getTransaction);
transactionRouter.put("/:id", updateTransaction);
transactionRouter.delete("/:id", deleteTransaction);

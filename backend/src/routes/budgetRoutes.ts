import { Router } from "express";
import {
  createBudget,
  deleteBudget,
  getMonthReport,
  listBudgets,
  updateBudget,
} from "../controllers/budgetController";
import { requireAuth } from "../middleware/auth";

export const budgetRouter = Router();

budgetRouter.use(requireAuth);
budgetRouter.post("/", createBudget);
budgetRouter.get("/current", getMonthReport);
budgetRouter.get("/", listBudgets);
budgetRouter.put("/:id", updateBudget);
budgetRouter.delete("/:id", deleteBudget);

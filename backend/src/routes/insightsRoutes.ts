import { Router } from "express";
import { getMonthReport } from "../controllers/budgetController";
import { requireAuth } from "../middleware/auth";

export const insightsRouter = Router();

insightsRouter.use(requireAuth);
insightsRouter.get("/", getMonthReport);

import { Router } from "express";
import { getSummary } from "../controllers/summaryController";
import { requireAuth } from "../middleware/auth";

export const summaryRouter = Router();

summaryRouter.get("/", requireAuth, getSummary);

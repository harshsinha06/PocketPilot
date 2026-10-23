import { Router } from "express";
import mongoose from "mongoose";
import { authRouter } from "./authRoutes";
import { budgetRouter } from "./budgetRoutes";
import { insightsRouter } from "./insightsRoutes";
import { summaryRouter } from "./summaryRoutes";
import { investmentRouter } from "./investmentRoutes";
import { transactionRouter } from "./transactionRoutes";

export const router = Router();

router.get("/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected
      ? "PocketPilot API is running"
      : "Database is not connected",
    data: { database: connected ? "connected" : "disconnected" },
  });
});

router.use("/auth", authRouter);
router.use("/transactions", transactionRouter);
router.use("/summary", summaryRouter);
router.use("/budgets", budgetRouter);
router.use("/insights", insightsRouter);
router.use("/investments", investmentRouter);

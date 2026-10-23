import { Router } from "express";
import {
  createContribution,
  createHolding,
  createSip,
  deleteContribution,
  deleteHolding,
  getInvestments,
  stopSip,
  updateHolding,
} from "../controllers/investmentController";
import { requireAuth } from "../middleware/auth";

export const investmentRouter = Router();

investmentRouter.use(requireAuth);
investmentRouter.get("/", getInvestments);
investmentRouter.post("/holdings", createHolding);
investmentRouter.put("/holdings/:id", updateHolding);
investmentRouter.delete("/holdings/:id", deleteHolding);
investmentRouter.post("/contributions", createContribution);
investmentRouter.delete("/contributions/:id", deleteContribution);
investmentRouter.post("/sips", createSip);
investmentRouter.post("/sips/:id/stop", stopSip);

import { Router } from "express";
import { addRecurring, deleteRecurring, login, logout, me, register, updateProfile, updateRecurring } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
authRouter.put("/profile", requireAuth, updateProfile);
authRouter.post("/recurring", requireAuth, addRecurring);
authRouter.put("/recurring/:id", requireAuth, updateRecurring);
authRouter.delete("/recurring/:id", requireAuth, deleteRecurring);

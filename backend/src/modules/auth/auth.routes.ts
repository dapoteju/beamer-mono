import { Router } from "express";
import { register, login, me, logout, setup, forgotPassword, verifyReset, performReset } from "./auth.controller";
import { requireAuth } from "../../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", requireAuth, register);
authRouter.post("/login", login);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", logout);
authRouter.post("/setup", setup);
authRouter.post("/forgot-password", forgotPassword);
authRouter.get("/reset-password/:token", verifyReset);
authRouter.post("/reset-password", performReset);

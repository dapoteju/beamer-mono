import { Request, Response } from "express";
import { registerUser, loginUser, getUserById } from "./auth.service";
import { RegisterInput, LoginInput } from "./auth.types";
import { AuthRequest } from "../../middleware/auth";

export async function register(req: Request, res: Response) {
  try {
    const input: RegisterInput = {
      email: req.body.email,
      password: req.body.password,
      fullName: req.body.full_name || req.body.fullName,
      orgId: req.body.org_id || req.body.orgId,
      role: req.body.role,
    };

    if (!input.email || !input.password || !input.fullName || !input.orgId || !input.role) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!["admin", "ops", "viewer"].includes(input.role)) {
      res.status(400).json({ error: "Invalid role. Must be admin, ops, or viewer" });
      return;
    }

    const result = await registerUser(input);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Registration failed" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const input: LoginInput = {
      email: req.body.email,
      password: req.body.password,
    };

    if (!input.email || !input.password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await loginUser(input);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || "Login failed" });
  }
}

export async function me(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch user" });
  }
}

export async function logout(req: Request, res: Response) {
  res.status(200).json({ message: "Logged out successfully" });
}

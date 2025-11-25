import { Request, Response } from "express";
import { registerUser, loginUser, getUserById, setupInitialAdmin, requestPasswordReset, verifyResetToken, resetPassword } from "./auth.service";
import { RegisterInput, LoginInput } from "./auth.types";
import { AuthRequest } from "../../middleware/auth";

export async function register(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({ error: "Only administrators can create new users" });
      return;
    }

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

export async function setup(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({ error: "Email, password, and full name are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const result = await setupInitialAdmin(email, password, fullName);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Setup failed" });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const result = await requestPasswordReset(email);
    
    const isDevelopment = process.env.NODE_ENV !== "production";
    
    if (isDevelopment) {
      console.log(`[DEV ONLY] Password reset token for ${email}: ${result.token}`);
      res.status(200).json({ 
        message: "If this email exists, a reset link has been sent.",
        devOnly: {
          resetToken: result.token,
          expiresAt: result.expiresAt,
          note: "This is only shown in development mode. In production, configure an email service."
        }
      });
    } else {
      res.status(200).json({ 
        message: "If this email exists, a reset link has been sent to your email address."
      });
    }
  } catch (error: any) {
    res.status(200).json({ message: "If this email exists, a reset link has been sent." });
  }
}

export async function verifyReset(req: Request, res: Response) {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    const result = await verifyResetToken(token);
    res.status(200).json({ valid: result.valid });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Verification failed" });
  }
}

export async function performReset(req: Request, res: Response) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: "Token and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    await resetPassword(token, password);
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Password reset failed" });
  }
}

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../../db/client";
import { users, organisations, passwordResetTokens } from "../../db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { User, AuthResponse, JWTPayload, RegisterInput, LoginInput } from "./auth.types";
import config from "../../config/config";

const JWT_SECRET = config.jwtSecret;
const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "7d";

export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("Email already registered");
  }

  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, input.orgId))
    .limit(1);

  if (!org) {
    throw new Error("Organisation not found");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const [newUser] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      orgId: input.orgId,
      role: input.role,
      updatedAt: new Date(),
    })
    .returning();

  const payload: JWTPayload = {
    userId: newUser.id,
    email: newUser.email,
    orgId: newUser.orgId!,
    role: newUser.role as "admin" | "ops" | "viewer",
    orgType: org.type as "advertiser" | "publisher" | "beamer_internal",
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      orgId: newUser.orgId!,
      role: newUser.role as "admin" | "ops" | "viewer",
      orgType: org.type as "advertiser" | "publisher" | "beamer_internal",
      orgName: org.name,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt!,
    },
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.passwordHash) {
    throw new Error("User account is not properly configured");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, user.orgId!))
    .limit(1);

  if (!org) {
    throw new Error("User's organisation not found");
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    orgId: user.orgId!,
    role: user.role as "admin" | "ops" | "viewer",
    orgType: org.type as "advertiser" | "publisher" | "beamer_internal",
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      orgId: user.orgId!,
      role: user.role as "admin" | "ops" | "viewer",
      orgType: org.type as "advertiser" | "publisher" | "beamer_internal",
      orgName: org.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt!,
    },
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.orgId || !user.updatedAt) {
    return null;
  }

  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, user.orgId))
    .limit(1);

  if (!org) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    orgId: user.orgId,
    role: user.role as "admin" | "ops" | "viewer",
    orgType: org.type as "advertiser" | "publisher" | "beamer_internal",
    orgName: org.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

export async function setupInitialAdmin(email: string, password: string, fullName: string): Promise<{ success: boolean; message: string }> {
  const existingUsers = await db.select().from(users).limit(1);
  
  if (existingUsers.length > 0) {
    throw new Error("Setup already completed. Users exist in the system.");
  }

  let beamerOrg = await db
    .select()
    .from(organisations)
    .where(eq(organisations.name, "Beamer Internal"))
    .limit(1);

  let beamerOrgId: string;

  if (beamerOrg.length === 0) {
    const [org] = await db
      .insert(organisations)
      .values({
        name: "Beamer Internal",
        type: "beamer_internal",
        organisationCategory: "beamer_internal",
        billingEmail: email,
        country: "NG",
      })
      .returning();
    beamerOrgId = org.id;
  } else {
    beamerOrgId = beamerOrg[0].id;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await db.insert(users).values({
    email,
    passwordHash,
    fullName,
    orgId: beamerOrgId,
    role: "admin",
    updatedAt: new Date(),
  });

  return { success: true, message: "Initial admin user created successfully" };
}

export async function requestPasswordReset(email: string): Promise<{ token: string; expiresAt: Date }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new Error("If this email exists, a reset link has been sent.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function verifyResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (!resetToken) {
    return { valid: false };
  }

  return { valid: true, userId: resetToken.userId };
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (!resetToken) {
    throw new Error("Invalid or expired reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, resetToken.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return { success: true };
}

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../db/client";
import { users, organisations } from "../../db/schema";
import { eq } from "drizzle-orm";
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

  const orgExists = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, input.orgId))
    .limit(1);

  if (orgExists.length === 0) {
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

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    orgId: user.orgId!,
    role: user.role as "admin" | "ops" | "viewer",
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

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    orgId: user.orgId,
    role: user.role as "admin" | "ops" | "viewer",
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

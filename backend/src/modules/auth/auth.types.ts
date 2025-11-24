export interface User {
  id: string;
  email: string;
  fullName: string;
  orgId: string;
  role: "admin" | "ops" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, "passwordHash">;
}

export interface JWTPayload {
  userId: string;
  email: string;
  orgId: string;
  role: "admin" | "ops" | "viewer";
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  orgId: string;
  role: "admin" | "ops" | "viewer";
}

export interface LoginInput {
  email: string;
  password: string;
}

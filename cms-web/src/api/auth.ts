import apiClient from "./client";

export interface User {
  id: string;
  email: string;
  fullName: string;
  orgId: string;
  role: "admin" | "ops" | "viewer";
  orgType: "advertiser" | "publisher" | "beamer_internal";
  orgName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function loginRequest(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return response.data;
}

export async function fetchMe(): Promise<{ user: User }> {
  const response = await apiClient.get<{ user: User }>("/auth/me");
  return response.data;
}

export async function registerUser(data: {
  email: string;
  password: string;
  full_name: string;
  org_id: string;
  role: "admin" | "ops" | "viewer";
}): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/register", data);
  return response.data;
}

export async function setupAdminRequest(
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>("/auth/setup", {
    email,
    password,
    fullName,
  });
  return response.data;
}

export async function forgotPasswordRequest(
  email: string
): Promise<{ message: string; devOnly?: { resetToken: string; expiresAt: string; note: string } }> {
  const response = await apiClient.post<{ message: string; devOnly?: { resetToken: string; expiresAt: string; note: string } }>("/auth/forgot-password", {
    email,
  });
  return response.data;
}

export async function verifyResetTokenRequest(
  token: string
): Promise<{ valid: boolean }> {
  const response = await apiClient.get<{ valid: boolean }>(`/auth/reset-password/${token}`);
  return response.data;
}

export async function resetPasswordRequest(
  token: string,
  password: string
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>("/auth/reset-password", {
    token,
    password,
  });
  return response.data;
}

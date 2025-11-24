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

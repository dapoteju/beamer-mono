import { create } from "zustand";
import { setAuthToken } from "../api/client";
import type { User } from "../api/auth";

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (data: { user: User; token: string }) => void;
  logout: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hasHydrated: false,

  setAuth: ({ user, token }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    setAuthToken(token);
    set({ user, token, isAuthenticated: true, hasHydrated: true });
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false, hasHydrated: true });
  },

  initFromStorage: () => {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("auth_user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        setAuthToken(token);
        set({ user, token, isAuthenticated: true, hasHydrated: true });
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        set({ hasHydrated: true });
      }
    } else {
      set({ hasHydrated: true });
    }
  },
}));

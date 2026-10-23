"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiRequest } from "./api";
import type { AuthResponse, User } from "./types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateIncome: (monthlyIncome: number, bonus: number) => Promise<void>;
  saveRecurring: (input: { id?: string; name: string; amount: number }) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const body = await apiRequest<AuthResponse>("/api/auth/me");
      setUser(body.data.user);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err instanceof Error && "status" in err && err.status === 401) {
        setError(null);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not check your session.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function login(email: string, password: string) {
    const body = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(body.data.user);
    setError(null);
  }

  async function register(input: {
    name: string;
    email: string;
    password: string;
  }) {
    const body = await apiRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: input,
    });
    setUser(body.data.user);
    setError(null);
  }

  async function logout() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setUser(null);
    setError(null);
  }

  async function updateIncome(monthlyIncome: number, bonus: number) {
    const body = await apiRequest<AuthResponse>("/api/auth/profile", {
      method: "PUT",
      body: { monthlyIncome, bonus },
    });
    setUser(body.data.user);
    setError(null);
  }

  async function saveRecurring(input: { id?: string; name: string; amount: number }) {
    const body = await apiRequest<AuthResponse>(input.id ? `/api/auth/recurring/${input.id}` : "/api/auth/recurring", {
      method: input.id ? "PUT" : "POST",
      body: { name: input.name, amount: input.amount },
    });
    setUser(body.data.user);
    setError(null);
  }

  async function removeRecurring(id: string) {
    const body = await apiRequest<AuthResponse>(`/api/auth/recurring/${id}`, { method: "DELETE" });
    setUser(body.data.user);
    setError(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, logout, refresh, updateIncome, saveRecurring, removeRecurring }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

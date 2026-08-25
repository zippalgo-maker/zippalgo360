"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import type { TokenResponse, User, UserRole } from "@/lib/types";

const TOKEN_STORAGE_KEY = "zippalgo360_token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: UserRole;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    apiFetch<User>("/auth/me", { token: storedToken })
      .then((me) => {
        setToken(storedToken);
        setUser(me);
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  function applyToken(result: TokenResponse) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, result.access_token);
    setToken(result.access_token);
    setUser(result.user);
    return result.user;
  }

  async function login(email: string, password: string) {
    const result = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    return applyToken(result);
  }

  async function register(input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: UserRole;
  }) {
    const result = await apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      body: input,
    });
    return applyToken(result);
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  bio: string | null;
  photo: string | null;
  coverPhoto?: string | null;
  subjects?: string[];
  coinBalance: number;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export interface RegisterData {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  role: "STUDENT" | "TEACHER";
  subjects?: string[];
}

const AuthContext = createContext<AuthContextType | null>(null);

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Xəta baş verdi");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      /* şəbəkə xətası — mövcud vəziyyəti saxla */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();
  }, [refreshUser]);

  const goHome = (role: User["role"]) =>
    window.location.replace(role === "TEACHER" ? "/teacher" : role === "ADMIN" ? "/admin" : "/student");

  async function login(identifier: string, password: string) {
    const data = await post("/api/auth/login", { identifier, password });
    setUser(data.user);
    goHome(data.user.role);
  }

  async function register(form: RegisterData) {
    const data = await post("/api/auth/register", form);
    setUser(data.user);
    goHome(data.user.role);
  }

  async function logout() {
    const wasAdmin = user?.role === "ADMIN";
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.replace(wasAdmin ? "/admin" : "/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

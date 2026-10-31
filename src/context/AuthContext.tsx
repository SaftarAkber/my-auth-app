"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
  const currentId = useRef<string | null>(null);
  useEffect(() => {
    currentId.current = user?.id ?? null;
  }, [user]);

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

  // Brauzerdə bir giriş cookie-si var: başqa tabda hesab dəyişəndə bu tab köhnə hesabı göstərir, amma sorğular yeni hesabdan gedir
  // (məs. bəyənmə başqa istifadəçi adından geri alınır). Tab aktiv olanda və ya başqa tab giriş/çıxış edəndə hesabı yoxlayıb yeniləyirik.
  useEffect(() => {
    if (loading) return;
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const id = res.ok ? ((await res.json()).user?.id ?? null) : null;
        if (id !== currentId.current) window.location.reload();
      } catch { /* şəbəkə xətası: toxunma */ }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    let chan: BroadcastChannel | null = null;
    try {
      chan = new BroadcastChannel("eduflow-auth");
      chan.onmessage = () => void check();
    } catch { /* köhnə brauzer */ }
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      chan?.close();
    };
  }, [loading]);

  const announce = () => {
    try {
      const c = new BroadcastChannel("eduflow-auth");
      c.postMessage("changed");
      c.close();
    } catch { /* ignore */ }
  };

  const goHome = (role: User["role"]) =>
    window.location.replace(role === "TEACHER" ? "/teacher" : role === "ADMIN" ? "/admin" : "/student");

  async function login(identifier: string, password: string) {
    const data = await post("/api/auth/login", { identifier, password });
    setUser(data.user);
    announce();
    goHome(data.user.role);
  }

  async function register(form: RegisterData) {
    const data = await post("/api/auth/register", form);
    setUser(data.user);
    announce();
    goHome(data.user.role);
  }

  async function logout() {
    const wasAdmin = user?.role === "ADMIN";
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    announce();
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

"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type User = {
  username: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (login: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "yumeko-auth";

const ADMIN_USER: User = {
  username: "yumekoadmin",
  handle: "@yumekoadmin",
  displayName: "YumekoAdmin",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        setUser(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, mounted]);

  const login = (loginValue: string, password: string) => {
    if (loginValue.trim().toLowerCase() === "admin" && password === "admin") {
      setUser(ADMIN_USER);
      return { ok: true as const };
    }
    return { ok: false as const, error: "Неверный логин или пароль" };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

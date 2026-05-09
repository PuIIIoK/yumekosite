"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
const CRYPTO_SECRET = process.env.NEXT_PUBLIC_CRYPTO_SECRET || "Ym3k0Stud10_S3cR3t_K3y_2024!xQ9";

export type Role = {
  id: number;
  name: string;
  displayName: string;
  color: string;
  priority: number;
};

export type ProfileEffects = {
  effectShimmer: boolean;
  effectBorderGlow: boolean;
  effectAvatarGlow: boolean;
  effectVerifiedBadge: boolean;
  accentColor: string | null;
};

export type User = {
  id: number;
  username: string;
  handle: string;
  displayName: string;
  bio?: string;
  hasAvatar: boolean;
  hasBanner: boolean;
  role: Role;
  imageVersion: number;
  effects: ProfileEffects;
};

type AuthResult = { ok: true; user: User } | { ok: false; error: string };
type UpdateResult = { ok: true; user: User } | { ok: false; error: string };

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, password: string, confirmPassword: string) => Promise<AuthResult>;
  updateProfile: (data: { displayName?: string; bio?: string; effectShimmer?: boolean; effectBorderGlow?: boolean; effectAvatarGlow?: boolean; effectVerifiedBadge?: boolean; accentColor?: string }) => Promise<UpdateResult>;
  uploadImage: (type: "avatar" | "banner", file: File) => Promise<UpdateResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "yumeko-auth";

function parseHexDump(hexDump: string): string {
  const bytes: number[] = [];
  for (const line of hexDump.split("\n")) {
    if (!line.trim()) continue;
    const hexPart = line.substring(10, 58).trim();
    for (const h of hexPart.split(/\s+/)) {
      if (h.length === 2) bytes.push(parseInt(h, 16));
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function encryptText(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(CRYPTO_SECRET);
  const keyBytes = new Uint8Array(32);
  keyBytes.set(secretBytes.slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, encoder.encode(plainText)));
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv, 0);
  combined.set(encrypted, iv.length);
  return bytesToHex(combined);
}

function mapUser(dto: any): User {
  return {
    id: dto.id,
    username: dto.username,
    handle: `@${dto.username}`,
    displayName: dto.displayName,
    bio: dto.bio,
    hasAvatar: dto.hasAvatar ?? false,
    hasBanner: dto.hasBanner ?? false,
    role: dto.role || { id: 0, name: "USER", displayName: "User", color: "#6b7280", priority: 0 },
    imageVersion: dto.imageVersion ?? Date.now(),
    effects: {
      effectShimmer: dto.effectShimmer ?? false,
      effectBorderGlow: dto.effectBorderGlow ?? false,
      effectAvatarGlow: dto.effectAvatarGlow ?? false,
      effectVerifiedBadge: dto.effectVerifiedBadge ?? false,
      accentColor: dto.accentColor ?? null,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.role || typeof parsed.role === "string") {
          parsed.role = { id: 0, name: "USER", displayName: "User", color: "#6b7280", priority: 0 };
        }
        if (parsed.avatarUrl !== undefined) {
          parsed.hasAvatar = !!parsed.avatarUrl;
          delete parsed.avatarUrl;
        }
        if (parsed.bannerUrl !== undefined) {
          parsed.hasBanner = !!parsed.bannerUrl;
          delete parsed.bannerUrl;
        }
        parsed.hasAvatar = parsed.hasAvatar ?? false;
        parsed.hasBanner = parsed.hasBanner ?? false;
        parsed.imageVersion = parsed.imageVersion ?? Date.now();
        setUser(parsed as User);
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

  const login = async (username: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!data.ok) {
        return { ok: false, error: data.message || "Неверный логин или пароль" };
      }

      const u = mapUser(data.user);
      setUser(u);
      return { ok: true, user: u };
    } catch {
      return { ok: false, error: "Ошибка соединения с сервером" };
    }
  };

  const register = async (username: string, password: string, confirmPassword: string): Promise<AuthResult> => {
    try {
      const encryptedPassword = await encryptText(password);
      const encryptedConfirmPassword = await encryptText(confirmPassword);

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: encryptedPassword, confirmPassword: encryptedConfirmPassword }),
      });

      const data = await res.json();

      if (!data.ok) {
        return { ok: false, error: data.message || "Ошибка регистрации" };
      }

      const u = mapUser(data.user);
      setUser(u);
      return { ok: true, user: u };
    } catch {
      return { ok: false, error: "Ошибка соединения с сервером" };
    }
  };

  const updateProfile = async (data: { displayName?: string; bio?: string; effectShimmer?: boolean; effectBorderGlow?: boolean; effectAvatarGlow?: boolean; effectVerifiedBadge?: boolean; accentColor?: string }): Promise<UpdateResult> => {
    if (!user) return { ok: false, error: "Не авторизован" };
    try {
      const res = await fetch(`${API_URL}/api/profile/${user.username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const hexText = await res.text();
      const result = JSON.parse(parseHexDump(hexText));

      if (!result.ok) {
        return { ok: false, error: result.message || "Ошибка обновления" };
      }

      const u = mapUser(result.user);
      setUser(u);
      return { ok: true, user: u };
    } catch {
      return { ok: false, error: "Ошибка соединения с сервером" };
    }
  };

  const uploadImage = async (type: "avatar" | "banner", file: File): Promise<UpdateResult> => {
    if (!user) return { ok: false, error: "Не авторизован" };
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/profile/${user.username}/${type}`, {
        method: "POST",
        body: formData,
      });

      const hexText = await res.text();
      const result = JSON.parse(parseHexDump(hexText));

      if (!result.ok) {
        return { ok: false, error: result.message || "Ошибка загрузки" };
      }

      const u = mapUser(result.user);
      u.imageVersion = Date.now();
      setUser(u);
      return { ok: true, user: u };
    } catch {
      return { ok: false, error: "Ошибка соединения с сервером" };
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, updateProfile, uploadImage, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

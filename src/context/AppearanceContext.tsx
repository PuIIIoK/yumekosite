"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode = "dark" | "light";
export type FontSize = "small" | "medium" | "large";

export interface AccentColor {
  name: string;
  value: string;
  hover: string;
  rgb: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  { name: "purple", value: "#a855f7", hover: "#8b5cf6", rgb: "168,85,247" },
  { name: "blue", value: "#3b82f6", hover: "#2563eb", rgb: "59,130,246" },
  { name: "green", value: "#10b981", hover: "#059669", rgb: "16,185,129" },
  { name: "amber", value: "#f59e0b", hover: "#d97706", rgb: "245,158,11" },
  { name: "pink", value: "#ec4899", hover: "#db2777", rgb: "236,72,153" },
  { name: "indigo", value: "#6366f1", hover: "#4f46e5", rgb: "99,102,241" },
];

interface AppearanceState {
  theme: ThemeMode;
  accent: AccentColor;
  fontSize: FontSize;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
  setFontSize: (f: FontSize) => void;
}

const defaultAccent = ACCENT_COLORS[0];

const AppearanceContext = createContext<AppearanceState>({
  theme: "dark",
  accent: defaultAccent,
  fontSize: "medium",
  setTheme: () => {},
  setAccent: () => {},
  setFontSize: () => {},
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

const FONT_SIZES: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentColor>(defaultAccent);
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("yumeko-appearance");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.theme) setThemeState(data.theme);
        if (data.accentName) {
          const found = ACCENT_COLORS.find((c) => c.name === data.accentName);
          if (found) setAccentState(found);
        }
        if (data.fontSize) setFontSizeState(data.fontSize);
      } catch {}
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(
      "yumeko-appearance",
      JSON.stringify({ theme, accentName: accent.name, fontSize })
    );
  }, [theme, accent, fontSize, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    // Theme
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
      root.style.setProperty("--bg-primary", "#0d0d0f");
      root.style.setProperty("--bg-secondary", "#141416");
      root.style.setProperty("--bg-card", "#1c1c1f");
      root.style.setProperty("--bg-card-hover", "#252528");
      root.style.setProperty("--bg-elevated", "#1f1f23");
      root.style.setProperty("--text-primary", "#f0f0f0");
      root.style.setProperty("--text-secondary", "#8a8a8a");
      root.style.setProperty("--text-muted", "#555");
      root.style.setProperty("--border-color", "rgba(255, 255, 255, 0.06)");
      root.style.setProperty("--border-hover", "rgba(255, 255, 255, 0.12)");
    } else {
      root.setAttribute("data-theme", "light");
      root.style.setProperty("--bg-primary", "#f8f8fa");
      root.style.setProperty("--bg-secondary", "#ffffff");
      root.style.setProperty("--bg-card", "#ffffff");
      root.style.setProperty("--bg-card-hover", "#f0f0f2");
      root.style.setProperty("--bg-elevated", "#f4f4f6");
      root.style.setProperty("--text-primary", "#111111");
      root.style.setProperty("--text-secondary", "#555555");
      root.style.setProperty("--text-muted", "#999999");
      root.style.setProperty("--border-color", "rgba(0, 0, 0, 0.08)");
      root.style.setProperty("--border-hover", "rgba(0, 0, 0, 0.15)");
    }

    // Accent
    root.style.setProperty("--accent", accent.value);
    root.style.setProperty("--accent-hover", accent.hover);
    root.style.setProperty("--accent-soft", `rgba(${accent.rgb}, 0.15)`);
    root.style.setProperty("--accent-pink-soft", `rgba(${accent.rgb}, 0.08)`);

    // Background gradient glow
    root.style.setProperty("--gradient-glow-1", `rgba(${accent.rgb}, 0.12)`);
    root.style.setProperty("--gradient-glow-2", `rgba(${accent.rgb}, 0.06)`);
    root.style.setProperty("--gradient-glow-3", `rgba(${accent.rgb}, 0.05)`);

    // Font size
    root.style.setProperty("--base-font-size", FONT_SIZES[fontSize]);
    root.style.fontSize = FONT_SIZES[fontSize];
  }, [theme, accent, fontSize, mounted]);

  const setTheme = (t: ThemeMode) => setThemeState(t);
  const setAccent = (a: AccentColor) => setAccentState(a);
  const setFontSize = (f: FontSize) => setFontSizeState(f);

  return (
    <AppearanceContext.Provider value={{ theme, accent, fontSize, setTheme, setAccent, setFontSize }}>
      {children}
    </AppearanceContext.Provider>
  );
}

// ─── Server Configuration ───
// Change the API server URL here. This is the single source of truth
// for all backend API calls across the site.

const isDev = process.env.NODE_ENV !== "production";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? "http://localhost:8081" : "https://api.yumeko.ru");

// ─── CDN Configuration ───
export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.yumeko.ru";

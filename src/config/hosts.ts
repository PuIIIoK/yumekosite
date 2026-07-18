// ─── Server Configuration ───
// Change the API server URL here. This is the single source of truth
// for all backend API calls across the site.

const isDev = process.env.NODE_ENV !== "production";

function normalizeApiUrl(url: string): string {
  if (isDev) return url;
  return url.replace(/^http:\/\//, "https://");
}

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? "http://localhost:8081" : "https://api2.yumeko.ru");

export const API_URL = normalizeApiUrl(rawApiUrl);

// ─── CDN Configuration ───
export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.yumeko.ru";

// ─── Conversion Service ───
// Сервис загрузки и конвертации эпизодов (тяжёлые видео-операции)
export const CONV_URL =
  process.env.NEXT_PUBLIC_CONV_URL || "https://conv.yumeko.ru";

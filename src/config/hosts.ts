// ─── Server Configuration ───
// Change the API server URL here. This is the single source of truth
// for all backend API calls across the site.

//export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.yumeko.ru";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

// ─── CDN Configuration ───
export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.yumeko.ru";

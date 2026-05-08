import type { Release } from "./anilibria-types";

const API_BASE = "https://anilibria.top/api/v1";

// ── Fetch a single release by ID ──
export async function fetchRelease(id: number | string): Promise<Release> {
  const res = await fetch(`${API_BASE}/anime/releases/${id}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`[AniLibria] Failed to fetch release ${id}: ${res.status}`);
  }

  return res.json();
}

// ── Fetch a release by alias (slug) ──
export async function fetchReleaseByAlias(alias: string): Promise<Release> {
  const res = await fetch(`${API_BASE}/anime/releases/${alias}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`[AniLibria] Failed to fetch release by alias "${alias}": ${res.status}`);
  }

  return res.json();
}

// ── Search releases ──
export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
}

export async function searchReleases(
  params: SearchParams = {},
): Promise<PaginatedResponse<Release>> {
  const url = new URL(`${API_BASE}/anime/catalog/releases`);

  if (params.query) url.searchParams.set("search", params.query);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`[AniLibria] Search failed: ${res.status}`);
  }

  return res.json();
}

// ── Fetch latest/schedule releases ──
export async function fetchLatestReleases(
  limit = 12,
): Promise<Release[]> {
  const res = await fetch(
    `${API_BASE}/anime/releases/latest?limit=${limit}`,
    { next: { revalidate: 60 } },
  );

  if (!res.ok) {
    throw new Error(`[AniLibria] Failed to fetch latest releases: ${res.status}`);
  }

  return res.json();
}

// ── Build full poster URL from relative path ──
export function posterUrl(path: string): string {
  return `https://anilibria.top${path}`;
}

// ── Build full episode preview URL ──
export function episodePreviewUrl(path: string): string {
  return `https://anilibria.top${path}`;
}

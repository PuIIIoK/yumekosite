import { API_URL } from "@/config/hosts";

export interface AnimePreview {
  id: number;
  title: string;
  ep: string;
  meta: string;
  rating: string;
  genres: string;
  poster: string;
  isHidden?: boolean;
  hiddenStudio?: string | null;
}

export interface AnimeDetails extends AnimePreview {
  altTitle: string;
  synopsis: string;
  description: string;
  studio: string;
  season: string;
  year: string;
  format: string;
  episodes: string;
  duration: string;
  status: string;
  badges: string[];
  relatedIds: number[];
  anilibriaAlias?: string;
}

export const ratingAccent: Record<string, string> = {
  "12+": "#2dd4bf",
  "16+": "#f97316",
  "18+": "#ef4444",
};

export const getAccent = (rating: string) => ratingAccent[rating] ?? "#f97316";

export function parseHiddenStudios(hiddenStudio?: string | null): string[] {
  return (hiddenStudio ?? "")
    .split(/[,;\n]/)
    .map((studio) => studio.trim())
    .filter(Boolean);
}

export function isAnimeHidden(anime?: Pick<AnimePreview, "isHidden"> | null) {
  return !!anime?.isHidden;
}

export function isStudioHiddenForAnime(
  anime?: Pick<AnimePreview, "hiddenStudio"> | null,
  studio?: string | null,
) {
  if (!studio) return false;
  return parseHiddenStudios(anime?.hiddenStudio).includes(studio);
}

let _cache: AnimeDetails[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000;

export async function fetchAnimeCatalog(): Promise<AnimeDetails[]> {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;
  try {
    const res = await fetch(`${API_URL}/api/anime`, { next: { revalidate: 60 } });
    if (!res.ok) return _cache ?? [];
    const data: AnimeDetails[] = await res.json();
    _cache = data;
    _cacheTime = Date.now();
    return data;
  } catch {
    return _cache ?? [];
  }
}

export async function fetchAnimeById(id: string | number): Promise<AnimeDetails | undefined> {
  const url = `${API_URL}/api/anime/${id}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error(`[fetchAnimeById] ${url} → HTTP ${res.status} ${res.statusText}`);
      return undefined;
    }
    return await res.json();
  } catch (e) {
    console.error(`[fetchAnimeById] Network error for ${url}:`, e);
    return undefined;
  }
}


export async function getNewEpisodes(): Promise<AnimePreview[]> {
  const catalog = await fetchAnimeCatalog();
  return catalog
    .filter((anime) => !isAnimeHidden(anime))
    .map(({ id, title, ep, meta, rating, genres, poster, isHidden, hiddenStudio }) => ({
      id, title, ep, meta, rating, genres, poster, isHidden, hiddenStudio,
    }));
}

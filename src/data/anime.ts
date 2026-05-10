import { API_URL } from "@/config/hosts";

export interface AnimePreview {
  id: number;
  title: string;
  ep: string;
  meta: string;
  rating: string;
  genres: string;
  poster: string;
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
  try {
    const res = await fetch(`${API_URL}/api/anime/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  }
}

export async function getNewEpisodes(): Promise<AnimePreview[]> {
  const catalog = await fetchAnimeCatalog();
  return catalog.map(({ id, title, ep, meta, rating, genres, poster }) => ({
    id, title, ep, meta, rating, genres, poster,
  }));
}

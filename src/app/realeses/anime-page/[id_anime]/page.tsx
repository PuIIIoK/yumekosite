import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header/Header";
import { animeCatalog, getAccent, getAnimeById } from "@/data/anime";
import { fetchReleaseByAlias, posterUrl } from "@/data/anilibria-api";
import AnimePageContent, { type ApiEpisode } from "./AnimePageContent";
import styles from "./page.module.scss";

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function colorDistance(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function fallbackColors(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  const h1 = 50 + (Math.abs(hash) % 250);
  const h2 = 50 + (Math.abs(hash * 7 + 13) % 250);
  const [r1, g1, b1] = hslToRgb(h1, 0.7, 0.5);
  const [r2, g2, b2] = hslToRgb(h2, 0.6, 0.45);
  return [`${r1},${g1},${b1}`, `${r2},${g2},${b2}`];
}

async function extractPosterColors(url: string, title: string): Promise<[string, string]> {
  try {
    const sharp = (await import("sharp")).default;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return fallbackColors(title);
    const buffer = Buffer.from(await res.arrayBuffer());
    const { data } = await sharp(buffer)
      .resize(32, 32, { fit: "cover" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels: { r: number; g: number; b: number; score: number }[] = [];
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);
      if (l < 0.08 || l > 0.92) continue;
      const hDeg = h * 360;
      if (hDeg < 50 || hDeg > 300) continue;
      const score = s * (0.5 + Math.abs(l - 0.5));
      pixels.push({ r, g, b, score });
    }

    pixels.sort((a, b) => b.score - a.score);

    if (pixels.length === 0) return fallbackColors(title);

    const best = pixels[0];
    const c1 = [best.r, best.g, best.b];

    let c2 = c1;
    for (const p of pixels) {
      if (colorDistance([p.r, p.g, p.b], c1) > 80) {
        c2 = [p.r, p.g, p.b];
        break;
      }
    }

    return [
      `${c1[0]},${c1[1]},${c1[2]}`,
      `${c2[0]},${c2[1]},${c2[2]}`,
    ];
  } catch (e) {
    console.error("[AnimePage] Poster fetch failed, using fallback colors:", e);
    return fallbackColors(title);
  }
}

export async function generateStaticParams() {
  return animeCatalog.map((anime) => ({
    id_anime: String(anime.id),
  }));
}

type AnimePageProps = {
  params: Promise<{
    id_anime: string;
  }>;
};

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { id_anime } = await params;
  const anime = getAnimeById(id_anime);
  if (!anime) return { title: "Релиз не найден" };
  return {
    title: anime.title,
    description: anime.description || anime.synopsis || `${anime.title} — смотрите онлайн в озвучке YumekoStudio`,
    openGraph: {
      title: `${anime.title} | YumekoStudio`,
      description: anime.description || anime.synopsis,
      url: `/realeses/anime-page/${id_anime}`,
      siteName: "YumekoStudio",
      images: anime.poster ? [{ url: anime.poster, width: 600, height: 900, alt: anime.title }] : [],
      type: "video.movie",
      locale: "ru_RU",
    },
    twitter: {
      card: "summary_large_image",
      title: `${anime.title} | YumekoStudio`,
      description: anime.description || anime.synopsis,
      images: anime.poster ? [anime.poster] : [],
    },
  };
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id_anime } = await params;
  const anime = getAnimeById(id_anime);

  if (!anime) {
    notFound();
  }

  const accent = getAccent(anime.rating);

  let apiEpisodes: ApiEpisode[] = [];
  let glowA = "30,30,40";
  let glowB = "20,20,30";

  if (anime.anilibriaAlias) {
    try {
      const release = await fetchReleaseByAlias(anime.anilibriaAlias);
      apiEpisodes = release.episodes
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((ep) => ({
          ordinal: ep.ordinal,
          name: ep.name,
          duration: ep.duration,
          preview: ep.preview?.optimized?.src
            ? posterUrl(ep.preview.optimized.src)
            : ep.preview?.src
              ? posterUrl(ep.preview.src)
              : null,
        }));
    } catch (e) {
      console.error("[AnimePage] Failed to fetch AniLibria episodes:", e);
    }
  }

  if (anime.poster) {
    [glowA, glowB] = await extractPosterColors(anime.poster, anime.title);
  } else {
    [glowA, glowB] = fallbackColors(anime.title);
  }

  return (
    <>
      <Header />
      <main
        className={styles.main}
        style={{
          "--poster-glow-a": glowA,
          "--poster-glow-b": glowB,
        } as React.CSSProperties}
      >
        <div className={styles.container}>
          <AnimePageContent anime={anime} accent={accent} apiEpisodes={apiEpisodes} />
        </div>
      </main>
    </>
  );
}

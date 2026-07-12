import type { Metadata } from "next";
import { fetchAnimeById, isAnimeHidden } from "@/data/anime";
import AnimePageClient from "./AnimePageClient";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type AnimePageProps = {
  params: Promise<{
    id_anime: string;
  }>;
};

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { id_anime } = await params;
  // Best-effort metadata. If the backend is unreachable from the server (e.g.
  // Vercel edge cannot reach the self-hosted API), we fall back to a generic
  // title — the page itself still renders via client-side fetching.
  const anime = await fetchAnimeById(id_anime);
  if (!anime || isAnimeHidden(anime)) {
    return { title: "Yumeko — релиз" };
  }
  const ogImage = `/og/${anime.id}.jpg`;
  return {
    title: anime.title,
    description: anime.description || anime.synopsis || `${anime.title} — смотрите онлайн в озвучке Yumeko`,
    openGraph: {
      title: `${anime.title} | Yumeko`,
      description: anime.description || anime.synopsis,
      url: `/realeses/anime-page/${id_anime}`,
      siteName: "Yumeko",
      images: [{ url: ogImage, width: 600, height: 900, alt: anime.title, type: "image/jpeg" }],
      type: "video.movie",
      locale: "ru_RU",
    },
    twitter: {
      card: "summary_large_image",
      title: `${anime.title} | Yumeko`,
      description: anime.description || anime.synopsis,
      images: [ogImage],
    },
  };
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id_anime } = await params;
  return <AnimePageClient id={id_anime} />;
}

import { notFound } from "next/navigation";
import Header from "@/components/Header/Header";
import { fetchAnimeById, getAccent } from "@/data/anime";
import { API_URL } from "@/config/hosts";
import EpisodePlayerContent from "./EpisodePlayerContent";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type EpisodePageProps = {
  params: Promise<{
    id_anime: string;
    id_episode: string;
  }>;
};

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const { id_anime, id_episode } = await params;
  const anime = await fetchAnimeById(id_anime);
  if (!anime) return { title: "Не найдено" };

  let episodeTitle = "";
  try {
    const res = await fetch(`${API_URL}/api/episodes/${id_anime}`, { cache: "no-store" });
    if (res.ok) {
      const episodes = await res.json();
      const ep = episodes.find((e: { id: number }) => String(e.id) === id_episode);
      if (ep) episodeTitle = ep.title || `Эпизод ${ep.number}`;
    }
  } catch {}

  return {
    title: `${episodeTitle || "Эпизод"} — ${anime.title}`,
    description: `Смотрите ${episodeTitle || "эпизод"} аниме ${anime.title} онлайн на YumekoStudio`,
  };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id_anime, id_episode } = await params;
  const anime = await fetchAnimeById(id_anime);
  if (!anime) notFound();

  let episodes: {
    id: number;
    animeId: number;
    number: number;
    title: string | null;
    hlsUrl: string | null;
    previewUrl: string | null;
    status: string;
    createdAt: string;
  }[] = [];

  try {
    const res = await fetch(`${API_URL}/api/episodes/${id_anime}`, { cache: "no-store" });
    if (res.ok) {
      episodes = await res.json();
    }
  } catch {}

  const currentEp = episodes.find((e) => String(e.id) === id_episode);
  if (!currentEp) notFound();

  const accent = getAccent(anime!.rating);

  return (
    <>
      <Header />
      <EpisodePlayerContent
        anime={anime!}
        episode={currentEp}
        episodes={episodes}
        accent={accent}
      />
    </>
  );
}

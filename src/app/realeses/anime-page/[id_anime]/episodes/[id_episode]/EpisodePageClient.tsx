"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header/Header";
import {
  type AnimeDetails,
  getAccent,
  isAnimeHidden,
  parseHiddenStudios,
} from "@/data/anime";
import { API_URL } from "@/config/hosts";
import EpisodePlayerContent from "./EpisodePlayerContent";
import HiddenAnimePage from "@/app/realeses/anime-page/[id_anime]/HiddenAnimePage";

interface Episode {
  id: number;
  animeId: number;
  number: number;
  title: string | null;
  hlsUrl: string | null;
  previewUrl: string | null;
  introStart: number | null;
  introEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
  studio: string;
  status: string;
  createdAt: string;
}

type Status = "loading" | "ready" | "hidden" | "notfound";

export default function EpisodePageClient({
  idAnime,
  idEpisode,
}: {
  idAnime: string;
  idEpisode: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [anime, setAnime] = useState<AnimeDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEp, setCurrentEp] = useState<Episode | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setStatus("loading");
      try {
        const res = await fetch(`${API_URL}/api/anime/${idAnime}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (active) setStatus("notfound");
          return;
        }
        const animeData: AnimeDetails = await res.json();
        if (!active) return;

        if (isAnimeHidden(animeData)) {
          setStatus("hidden");
          return;
        }

        const hiddenStudios = parseHiddenStudios(animeData.hiddenStudio);

        let list: Episode[] = [];
        try {
          const epRes = await fetch(`${API_URL}/api/episodes/${idAnime}`, {
            cache: "no-store",
          });
          if (epRes.ok) {
            list = ((await epRes.json()) as Episode[]).filter(
              (ep) =>
                ep.status === "ready" &&
                !hiddenStudios.includes(ep.studio || "YumekoStudio"),
            );
          }
        } catch {
          // ignore — handled below via notfound
        }

        if (!active) return;

        const ep = list.find((e) => String(e.id) === idEpisode);
        if (!ep) {
          setStatus("notfound");
          return;
        }

        setAnime(animeData);
        setEpisodes(list);
        setCurrentEp(ep);
        setStatus("ready");
      } catch {
        if (active) setStatus("notfound");
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [idAnime, idEpisode]);

  if (status === "hidden") {
    return <HiddenAnimePage />;
  }

  if (status === "loading") {
    return <Header />;
  }

  if (status === "notfound" || !anime || !currentEp) {
    return (
      <>
        <Header />
        <div style={{ padding: "120px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Эпизод не найден</h1>
          <p style={{ opacity: 0.7 }}>
            Возможно, эпизод был удалён или ещё не готов.
          </p>
        </div>
      </>
    );
  }

  // NOTE: No <Header /> here — the player page is a focused, immersive view.
  return (
    <EpisodePlayerContent
      anime={anime}
      episode={currentEp}
      episodes={episodes}
      accent={getAccent(anime.rating)}
    />
  );

}

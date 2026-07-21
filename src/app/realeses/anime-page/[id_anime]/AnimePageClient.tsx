"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header/Header";
import {
  type AnimeDetails,
  getAccent,
  isAnimeHidden,
} from "@/data/anime";
import { API_URL } from "@/config/hosts";
import AnimePageContent, { type DbEpisode } from "./AnimePageContent";
import HiddenAnimePage from "./HiddenAnimePage";
import styles from "./page.module.scss";

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
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

type Status = "loading" | "ready" | "hidden" | "notfound";

export default function AnimePageClient({ id }: { id: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [anime, setAnime] = useState<AnimeDetails | null>(null);
  const [dbEpisodes, setDbEpisodes] = useState<DbEpisode[]>([]);
  const [glow, setGlow] = useState<[string, string]>(["30,30,40", "20,20,30"]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setStatus("loading");
      try {
        const res = await fetch(`${API_URL}/api/anime/${id}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (active) setStatus("notfound");
          return;
        }
        const data: AnimeDetails = await res.json();
        if (!active) return;

        if (isAnimeHidden(data)) {
          setStatus("hidden");
          return;
        }

        setAnime(data);
        setGlow(fallbackColors(data.title));

        try {
          const epRes = await fetch(`${API_URL}/api/episodes/${data.id}`, {
            cache: "no-store",
          });
          if (epRes.ok && active) {
            setDbEpisodes(await epRes.json());
          }
        } catch {
          // Episodes are non-critical — the page still renders without them.
        }

        if (active) setStatus("ready");
      } catch {
        if (active) setStatus("notfound");
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  if (status === "hidden") {
    return <HiddenAnimePage />;
  }

  if (status === "loading") {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container} />
        </main>
      </>
    );
  }

  if (status === "notfound" || !anime) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <h1 style={{ fontSize: 28, marginBottom: 12 }}>Релиз не найден</h1>
              <p style={{ opacity: 0.7 }}>
                Возможно, релиз был удалён или ещё не добавлен.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main
        style={{
          paddingTop: "var(--header-height)",
          background: "transparent",
          minHeight: "100vh",
        }}
      >
        <AnimePageContent
          anime={anime}
          accent={getAccent(anime.rating)}
          dbEpisodes={dbEpisodes}
        />
      </main>
    </>
  );
}



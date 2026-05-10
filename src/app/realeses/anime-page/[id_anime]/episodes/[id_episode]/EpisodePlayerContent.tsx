"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, List } from "lucide-react";
import type { AnimeDetails } from "@/data/anime";
import VideoPlayer from "@/components/VideoPlayer/VideoPlayer";
import styles from "./episode.module.scss";

interface Episode {
  id: number;
  animeId: number;
  number: number;
  title: string | null;
  hlsUrl: string | null;
  previewUrl: string | null;
  studio: string;
  status: string;
  createdAt: string;
}

interface Props {
  anime: AnimeDetails;
  episode: Episode;
  episodes: Episode[];
  accent: string;
}

export default function EpisodePlayerContent({ anime, episode, episodes, accent }: Props) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const studioList = [...new Set(episodes.map((e) => e.studio || "YumekoStudio"))].sort();
  const [selectedStudio, setSelectedStudio] = useState<string>(
    episode.studio || studioList[0] || "YumekoStudio"
  );

  const filtered = studioList.length > 1
    ? episodes.filter((e) => (e.studio || "YumekoStudio") === selectedStudio)
    : episodes;
  const sorted = [...filtered].sort((a, b) => a.number - b.number);
  const currentIndex = sorted.findIndex((e) => e.id === episode.id);
  const prevEp = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  const nextEp = currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

  const playerEpisodes = sorted
    .filter((e) => e.hlsUrl)
    .map((e) => ({ id: e.id, number: e.number, title: e.title, hlsUrl: e.hlsUrl }));

  return (
    <main className={styles.playerPage}>
      <div className={styles.playerLayout}>
        {/* Video area */}
        <div className={styles.playerMain}>
          {/* Breadcrumb */}
          <nav className={styles.breadcrumb}>
            <Link href={`/realeses/anime-page/${anime.id}`}>
              <ChevronLeft size={14} />
              {anime.title}
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span>Эпизод {episode.number}</span>
          </nav>

          {/* Player */}
          {episode.hlsUrl ? (
            <VideoPlayer
              src={episode.hlsUrl}
              episodes={playerEpisodes}
              currentEpisodeId={episode.id}
              onEpisodeChange={(ep) => router.push(`/realeses/anime-page/${anime.id}/episodes/${ep.id}`)}
              accent={accent}
            />
          ) : (
            <div className={styles.playerWrap}>
              <div className={styles.noVideo}>
                <Play size={48} strokeWidth={1} />
                <p>Видео недоступно</p>
              </div>
            </div>
          )}

          {/* Episode info */}
          <div className={styles.episodeInfo}>
            <div className={styles.episodeMeta}>
              <h1 className={styles.episodeTitle}>
                {episode.title || `Эпизод ${episode.number}`}
              </h1>
              <p className={styles.episodeSub}>
                {anime.title} · Эпизод {episode.number}
                {episode.studio && (
                  <span className={styles.studioBadge}>{episode.studio}</span>
                )}
              </p>
            </div>

            <div className={styles.episodeNav}>
              {prevEp ? (
                <Link
                  href={`/realeses/anime-page/${anime.id}/episodes/${prevEp.id}`}
                  className={styles.navBtn}
                >
                  <ChevronLeft size={16} /> Пред.
                </Link>
              ) : (
                <span className={`${styles.navBtn} ${styles.navBtnDisabled}`}>
                  <ChevronLeft size={16} /> Пред.
                </span>
              )}
              {nextEp ? (
                <Link
                  href={`/realeses/anime-page/${anime.id}/episodes/${nextEp.id}`}
                  className={styles.navBtn}
                >
                  След. <ChevronRight size={16} />
                </Link>
              ) : (
                <span className={`${styles.navBtn} ${styles.navBtnDisabled}`}>
                  След. <ChevronRight size={16} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar with episode list */}
        {sidebarOpen && (
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <span>Эпизоды ({sorted.length})</span>
              <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>
                <ChevronRight size={16} />
              </button>
            </div>
            {studioList.length > 1 && (
              <div className={styles.studioTabs}>
                {studioList.map((s) => (
                  <button
                    key={s}
                    className={`${styles.studioTab} ${s === selectedStudio ? styles.studioTabActive : ""}`}
                    onClick={() => setSelectedStudio(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.sidebarList}>
              {sorted.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/realeses/anime-page/${anime.id}/episodes/${ep.id}`}
                  className={`${styles.sidebarItem} ${ep.id === episode.id ? styles.sidebarItemActive : ""}`}
                >
                  <span className={styles.sidebarNum}>{ep.number}</span>
                  <div className={styles.sidebarInfo}>
                    <span className={styles.sidebarTitle}>{ep.title || `Эпизод ${ep.number}`}</span>
                  </div>
                  {ep.id === episode.id && (
                    <Play size={14} className={styles.sidebarPlay} />
                  )}
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>

      {!sidebarOpen && (
        <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(true)}>
          <List size={16} />
        </button>
      )}
    </main>
  );
}

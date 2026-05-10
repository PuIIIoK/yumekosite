"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { ChevronLeft, ChevronRight, Play, List } from "lucide-react";
import type { AnimeDetails } from "@/data/anime";
import styles from "./episode.module.scss";

interface Episode {
  id: number;
  animeId: number;
  number: number;
  title: string | null;
  hlsUrl: string | null;
  previewUrl: string | null;
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !episode.hlsUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(episode.hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = episode.hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }
  }, [episode.hlsUrl]);

  const sorted = [...episodes].sort((a, b) => a.number - b.number);
  const currentIndex = sorted.findIndex((e) => e.id === episode.id);
  const prevEp = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  const nextEp = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

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
          <div className={styles.playerWrap}>
            {episode.hlsUrl ? (
              <video
                ref={videoRef}
                className={styles.video}
                controls
              />
            ) : (
              <div className={styles.noVideo}>
                <Play size={48} strokeWidth={1} />
                <p>Видео недоступно</p>
              </div>
            )}
          </div>

          {/* Episode info */}
          <div className={styles.episodeInfo}>
            <div className={styles.episodeMeta}>
              <h1 className={styles.episodeTitle}>
                {episode.title || `Эпизод ${episode.number}`}
              </h1>
              <p className={styles.episodeSub}>
                {anime.title} · Эпизод {episode.number}
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

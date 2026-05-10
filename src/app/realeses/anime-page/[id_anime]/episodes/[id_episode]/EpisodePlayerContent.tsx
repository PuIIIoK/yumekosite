"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, List, Check } from "lucide-react";
import type { AnimeDetails } from "@/data/anime";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/hosts";
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

export default function EpisodePlayerContent({ anime, episode: initialEpisode, episodes, accent }: Props) {
  const { user } = useAuth();
  const [currentEp, setCurrentEp] = useState<Episode>(initialEpisode);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const studioList = [...new Set(episodes.map((e) => e.studio || "YumekoStudio"))].sort((a, b) => {
    if (a === "YumekoStudio") return -1;
    if (b === "YumekoStudio") return 1;
    return a.localeCompare(b);
  });
  const [selectedStudio, setSelectedStudio] = useState<string>(
    currentEp.studio || studioList[0] || "YumekoStudio"
  );

  const filtered = studioList.length > 1
    ? episodes.filter((e) => (e.studio || "YumekoStudio") === selectedStudio)
    : episodes;
  const sorted = [...filtered].sort((a, b) => a.number - b.number);
  const currentIndex = sorted.findIndex((e) => e.id === currentEp.id);
  const prevEp = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  const nextEp = currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

  const playerEpisodes = sorted
    .filter((e) => e.hlsUrl)
    .map((e) => ({ id: e.id, number: e.number, title: e.title, hlsUrl: e.hlsUrl }));

  // ── Watch progress for sidebar ──
  const [watchProgress, setWatchProgress] = useState<Record<number, { watchedSeconds: number; totalSeconds: number; completed: boolean }>>({});

  useEffect(() => {
    if (!user) return;
    const ids = episodes.map((e) => e.id);
    if (ids.length === 0) return;
    fetch(`${API_URL}/api/watch-progress/bulk?userId=${user.id}&${ids.map((id) => `episodeIds=${id}`).join("&")}`)
      .then((r) => r.ok ? r.json() : [])
      .then((list: { episodeId: number; watchedSeconds: number; totalSeconds: number; completed: boolean }[]) => {
        const map: Record<number, { watchedSeconds: number; totalSeconds: number; completed: boolean }> = {};
        list.forEach((wp) => { map[wp.episodeId] = wp; });
        setWatchProgress(map);
      })
      .catch(() => {});
  }, [user, episodes.length]);

  const switchEpisode = useCallback((ep: Episode) => {
    setCurrentEp(ep);
    window.history.replaceState(null, "", `/realeses/anime-page/${anime.id}/episodes/${ep.id}`);
  }, [anime.id]);

  const handlePlayerEpisodeChange = useCallback((playerEp: { id: number }) => {
    const full = episodes.find((e) => e.id === playerEp.id);
    if (full) switchEpisode(full);
  }, [episodes, switchEpisode]);

  const handleNavClick = useCallback((ep: Episode | null, e: React.MouseEvent) => {
    if (!ep) return;
    e.preventDefault();
    switchEpisode(ep);
  }, [switchEpisode]);

  const handleSidebarClick = useCallback((ep: Episode, e: React.MouseEvent) => {
    e.preventDefault();
    switchEpisode(ep);
  }, [switchEpisode]);

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
            <span>Эпизод {currentEp.number}</span>
          </nav>

          {/* Player */}
          {currentEp.hlsUrl ? (
            <VideoPlayer
              src={currentEp.hlsUrl}
              episodes={playerEpisodes}
              currentEpisodeId={currentEp.id}
              onEpisodeChange={handlePlayerEpisodeChange}
              accent={accent}
              userId={user?.id}
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
                {currentEp.title || `Эпизод ${currentEp.number}`}
              </h1>
              <p className={styles.episodeSub}>
                {anime.title} · Эпизод {currentEp.number}
                {currentEp.studio && (
                  <span className={styles.studioBadge}>{currentEp.studio}</span>
                )}
              </p>
            </div>

            <div className={styles.episodeNav}>
              {prevEp ? (
                <a
                  href={`/realeses/anime-page/${anime.id}/episodes/${prevEp.id}`}
                  className={styles.navBtn}
                  onClick={(e) => handleNavClick(prevEp, e)}
                >
                  <ChevronLeft size={16} /> Пред.
                </a>
              ) : (
                <span className={`${styles.navBtn} ${styles.navBtnDisabled}`}>
                  <ChevronLeft size={16} /> Пред.
                </span>
              )}
              {nextEp ? (
                <a
                  href={`/realeses/anime-page/${anime.id}/episodes/${nextEp.id}`}
                  className={styles.navBtn}
                  onClick={(e) => handleNavClick(nextEp, e)}
                >
                  След. <ChevronRight size={16} />
                </a>
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
              {sorted.map((ep) => {
                const wp = watchProgress[ep.id];
                const pct = wp && wp.totalSeconds > 0 ? Math.round(wp.watchedSeconds / wp.totalSeconds * 100) : 0;
                return (
                  <a
                    key={ep.id}
                    href={`/realeses/anime-page/${anime.id}/episodes/${ep.id}`}
                    className={`${styles.sidebarItem} ${ep.id === currentEp.id ? styles.sidebarItemActive : ""}`}
                    onClick={(e) => handleSidebarClick(ep, e)}
                  >
                    <span className={styles.sidebarNum}>{ep.number}</span>
                    <div className={styles.sidebarInfo}>
                      <span className={styles.sidebarTitle}>{ep.title || `Эпизод ${ep.number}`}</span>
                      {pct > 0 && !wp?.completed && (
                        <div className={styles.sidebarProgress}>
                          <div className={styles.sidebarProgressBar} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    {wp?.completed ? (
                      <Check size={14} className={styles.sidebarCheck} />
                    ) : ep.id === currentEp.id ? (
                      <Play size={14} className={styles.sidebarPlay} />
                    ) : null}
                  </a>
                );
              })}
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

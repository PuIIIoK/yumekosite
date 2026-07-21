"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Save, Tv2, X, LogIn } from "lucide-react";
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
  introStart: number | null;
  introEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
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

const GUEST_MODAL_KEY = "yumeko-guest-episode-modal-dismissed";

export default function EpisodePlayerContent({
  anime,
  episode: initialEpisode,
  episodes,
  accent,
}: Props) {
  const { user, refreshUser, mounted } = useAuth();
  const [currentEp, setCurrentEp] = useState<Episode>(initialEpisode);

  // Модалка для гостей (показывается только один раз за сессию, если не была закрыта ранее)
  const [guestModal, setGuestModal] = useState(false);
  const guestModalShown = useRef(false);

  useEffect(() => {
    if (!mounted) return; // ждём пока AuthContext загрузит пользователя из localStorage
    if (user) return;
    if (guestModalShown.current) return;
    const dismissed = sessionStorage.getItem(GUEST_MODAL_KEY);
    if (!dismissed) {
      guestModalShown.current = true;
      setGuestModal(true);
    }
  }, [user, mounted]);

  const dismissGuestModal = () => {
    sessionStorage.setItem(GUEST_MODAL_KEY, "1");
    setGuestModal(false);
  };

  // Список эпизодов текущей студии (плеер сам показывает выдвижной список).
  const selectedStudio = currentEp.studio || "YumekoStudio";
  const sorted = [...episodes]
    .filter((e) => (e.studio || "YumekoStudio") === selectedStudio)
    .sort((a, b) => a.number - b.number);

  const playerEpisodes = sorted
    .filter((e) => e.hlsUrl)
    .map((e) => ({
      id: e.id,
      number: e.number,
      title: e.title,
      hlsUrl: e.hlsUrl,
      previewUrl: e.previewUrl,
    }));

  const switchEpisode = useCallback(
    (ep: Episode) => {
      setCurrentEp(ep);
      window.history.replaceState(
        null,
        "",
        `/realeses/anime-page/${anime.id}/episodes/${ep.id}`,
      );
    },
    [anime.id],
  );

  const handlePlayerEpisodeChange = useCallback(
    (playerEp: { id: number }) => {
      const full = episodes.find((e) => e.id === playerEp.id);
      if (full) switchEpisode(full);
    },
    [episodes, switchEpisode],
  );

  const canEditMarkers = !!user?.roles?.some((r) => (r.priority ?? 0) >= 90);

  const currentMarkers = {
    introStart: currentEp.introStart,
    introEnd: currentEp.introEnd,
    outroStart: currentEp.outroStart,
    outroEnd: currentEp.outroEnd,
  };

  const handleSaveMarkers = useCallback(
    async (m: {
      introStart: number | null;
      introEnd: number | null;
      outroStart: number | null;
      outroEnd: number | null;
    }) => {
      await fetch(`${API_URL}/api/episodes/${currentEp.id}/markers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      });
      setCurrentEp((prev) => ({ ...prev, ...m }));
    },
    [currentEp.id],
  );

  return (
    <main className={styles.playerPage}>
      <div className={styles.playerStage}>
        {currentEp.hlsUrl ? (
          <VideoPlayer
            src={currentEp.hlsUrl}
            episodes={playerEpisodes}
            currentEpisodeId={currentEp.id}
            onEpisodeChange={handlePlayerEpisodeChange}
            onEpisodeComplete={refreshUser}
            accent="var(--accent)"
            userId={user?.id}
            markers={currentMarkers}
            canEditMarkers={canEditMarkers}
            onSaveMarkers={handleSaveMarkers}
            title={anime.title}
            backHref={`/realeses/anime-page/${anime.id}`}
            fill
          />
        ) : (
          <div className={styles.noVideo}>
            <p>Видео недоступно</p>
            <Link
              href={`/realeses/anime-page/${anime.id}`}
              className={styles.noVideoBack}
            >
              Вернуться к аниме
            </Link>
          </div>
        )}
      </div>

      {/* ── Модалка для гостей ── */}
      {guestModal && (
        <>
          {/* Оверлей */}
          <div
            onClick={dismissGuestModal}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              animation: "fadeIn 0.25s ease",
            }}
          />
          {/* Карточка */}
          <div
            style={{
              position: "fixed",
              zIndex: 1001,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              maxWidth: 420,
              padding: "0 16px",
              animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <div
              style={{
                background: "var(--bg-elevated, #1f1f23)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "32px 28px",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                position: "relative",
              }}
            >
              {/* Пурпурная полоска */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "10%",
                  right: "10%",
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
                }}
              />
              {/* Закрыть */}
              <button
                onClick={dismissGuestModal}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "none",
                  border: "none",
                  color: "var(--text-muted, #555)",
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                <X size={18} />
              </button>

              {/* Заголовок */}
              <div style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--text-primary, #f0f0f0)",
                    margin: "0 0 6px",
                  }}
                >
                  Авторизуйтесь, чтобы:
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted, #555)",
                    margin: 0,
                  }}
                >
                  Войдите на сайт, если хотите использовать эти функции
                </p>
              </div>

              {/* Преимущества */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: "rgba(168,85,247,0.06)",
                    border: "1px solid rgba(168,85,247,0.14)",
                    borderRadius: 12,
                  }}
                >
                  <Save
                    size={18}
                    style={{ color: "var(--accent, #a855f7)", flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                      }}
                    >
                      Сохранение прогресса серии
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Продолжайте с того места, где остановились
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: "rgba(168,85,247,0.06)",
                    border: "1px solid rgba(168,85,247,0.14)",
                    borderRadius: 12,
                  }}
                >
                  <Tv2
                    size={18}
                    style={{ color: "var(--accent, #a855f7)", flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                      }}
                    >
                      Отслеживание текущей серии
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Показываем, на какой серии вы остановились
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопки */}
              <div style={{ display: "flex", gap: 10 }}>
                <Link
                  href={`/?openAuth=1`}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px",
                    borderRadius: 12,
                    background: "var(--accent, #a855f7)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                    transition: "opacity 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <LogIn size={16} /> Авторизоваться
                </Link>
                <button
                  onClick={dismissGuestModal}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "transparent",
                    color: "var(--text-muted, #555)",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  Продолжить без входа
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
            @keyframes slideUp { from { opacity:0; transform:translate(-50%,-48%) scale(0.97) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
          `}</style>
        </>
      )}
    </main>
  );
}

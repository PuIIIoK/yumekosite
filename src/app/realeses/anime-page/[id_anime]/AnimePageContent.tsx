"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppearance, type AccentColor } from "@/context/AppearanceContext";
import Link from "next/link";
import {
  BookMarked,
  ChevronDown,
  Eye,
  CalendarClock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Plus,
  Pencil,
  X,
  Check,
  Heart,
} from "lucide-react";
import { type AnimeDetails, parseHiddenStudios, isAnimeHidden } from "@/data/anime";

import { API_URL } from "@/config/hosts";
import styles from "./page.module.scss";
import Comments from "./Comments";
import ImageUploadField from "@/components/ImageUploadField/ImageUploadField";

// ── Palette derived from the site's accent color ──
type Palette = ReturnType<typeof makePalette>;

function makePalette(accent: AccentColor) {
  const parts = accent.rgb.split(",").map((n) => Number(n.trim()));
  const r = parts[0] ?? 232;
  const g = parts[1] ?? 84;
  const b = parts[2] ?? 122;

  // Warm-neutral near-black base tinted toward the accent hue.
  const dark: [number, number, number] = [10, 8, 12];

  const chDark = (t: number): [number, number, number] => [
    Math.round(r * t + dark[0] * (1 - t)),
    Math.round(g * t + dark[1] * (1 - t)),
    Math.round(b * t + dark[2] * (1 - t)),
  ];
  const mixDark = (t: number) => {
    const [cr, cg, cb] = chDark(t);
    return `rgb(${cr}, ${cg}, ${cb})`;
  };
  const mixLight = (t: number) =>
    `rgb(${Math.round(r * (1 - t) + 255 * t)}, ${Math.round(
      g * (1 - t) + 255 * t,
    )}, ${Math.round(b * (1 - t) + 255 * t)})`;

  const borderCh = chDark(0.26);

  return {
    pageRgb: `${dark[0]},${dark[1]},${dark[2]}`,
    roseRgb: accent.rgb,
    borderRgb: `${borderCh[0]},${borderCh[1]},${borderCh[2]}`,
    page: mixDark(0.02),
    card: mixDark(0.08),
    surface: mixDark(0.13),
    surface2: mixDark(0.19),
    dropdownBg: mixDark(0.1),
    border: mixDark(0.26),
    roseMuted: mixDark(0.5),
    rose: accent.value,
    roseDim: accent.hover,
    roseLight: mixLight(0.22),
    roseText: mixLight(0.35),
    genreText: mixLight(0.45),
    tabHover: mixLight(0.42),
    title: mixLight(0.93),
    text: mixLight(0.88),
    textSoft: mixLight(0.7),
    textMuted: mixLight(0.48),
  };
}

const TABS = ["Серии", "Актёры", "Связанное"] as const;

type Tab = (typeof TABS)[number];

export interface DbEpisode {
  id: number;
  animeId: number;
  number: number;
  title: string | null;
  hlsUrl: string | null;
  previewUrl: string | null;
  duration: string | null;
  studio: string;
  status: string;
  createdAt: string;
}

interface Props {
  anime: AnimeDetails;
  accent: string;
  dbEpisodes?: DbEpisode[];
}

// Append a cache-busting query param so a freshly updated episode cover is
// re-fetched instead of served from the browser cache under the same URL.
function bustCache(url: string | null, key: number): string | null {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${key}`;
}

const COLLECTION_ITEMS = [
  { key: "watching", label: "Смотрю", icon: Eye },
  { key: "planned", label: "Запланировано", icon: CalendarClock },
  { key: "completed", label: "Просмотрено", icon: CheckCircle2 },
  { key: "onhold", label: "Отложено", icon: PauseCircle },
  { key: "dropped", label: "Брошено", icon: XCircle },
] as const;

export default function AnimePageContent({ anime, dbEpisodes = [] }: Props) {
  const auth = useAuth();
  const { accent } = useAppearance();
  const C: Palette = useMemo(() => makePalette(accent), [accent]);
  const [tab, setTab] = useState<Tab>("Серии");
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collabSubmitting, setCollabSubmitting] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [collabSuccessOpen, setCollabSuccessOpen] = useState(false);
  const [collabSuccessStudio, setCollabSuccessStudio] = useState("");
  const [collabForm, setCollabForm] = useState({
    name: "",
    description: "",
    headUsername: "",
    avatar: "",
    banner: "",
    socials: "",
    contact: "",
  });
  const [collectionOpen, setCollectionOpen] = useState(false);
  const collectionRef = useRef<HTMLDivElement>(null);
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [coverCacheKey] = useState(() => Date.now());
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);
  const [hoveredEp, setHoveredEp] = useState<number | null>(null);
  const genreTags = anime.genres.split(",").map((g) => g.trim()).filter(Boolean);
  const [relatedItems, setRelatedItems] = useState<AnimeDetails[]>([]);
  const [voiceCast, setVoiceCast] = useState<
    {
      id: number;
      studio: string;
      actorName: string;
      actorUsername?: string;
      actorDisplayName?: string;
      actorHasAvatar?: boolean;
      actorRoleColor?: string;
      characterName: string;
    }[]
  >([]);

  const fetchStatuses = useCallback(async () => {
    if (!auth.user) return;
    try {
      const res = await fetch(
        `${API_URL}/api/collections/${auth.user.username}/anime/${anime.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        setActiveStatuses(data.statuses || []);
      }
    } catch {}
  }, [auth.user, anime.id]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Блокируем скролл страницы, пока открыта модалка предложить студию
  useEffect(() => {
    if (!collabModalOpen && !collabSuccessOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [collabModalOpen, collabSuccessOpen]);


  useEffect(() => {
    if (!collectionOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        collectionRef.current &&
        !collectionRef.current.contains(e.target as Node)
      ) {
        setCollectionOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [collectionOpen]);

  const toggleStatus = async (status: string) => {
    if (!auth.user) return;
    try {
      const res = await fetch(
        `${API_URL}/api/collections/${auth.user.username}/anime/${anime.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setActiveStatuses(data.statuses || []);
      }
    } catch {}
  };

  const submitCollab = async () => {
    if (!auth.user) return;
    if (!collabForm.name.trim() || !collabForm.contact.trim()) return;
    setCollabSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/collaboration-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animeId: anime.id,
          studioName: collabForm.name,
          description: collabForm.description,
          avatar: collabForm.avatar,
          banner: collabForm.banner,
          socials: collabForm.socials,
          contact: collabForm.contact,
          headUsername: auth.user.username,
        }),
      });
      if (res.ok) {
        setCollabModalOpen(false);
        setCollabSuccessStudio(collabForm.name.trim());
        setCollabSuccessOpen(true);
        setTimeout(() => window.dispatchEvent(new Event("notifications:refresh")), 250);
        setCollabForm({
          name: "",
          description: "",
          headUsername: "",
          avatar: "",
          banner: "",
          socials: "",
          contact: "",
        });
      } else {
        setCollabError("Не удалось отправить запрос. Попробуйте позже.");
      }
    } finally {
      setCollabSubmitting(false);
    }
  };

  useEffect(() => {
    if (isAnimeHidden(anime) || anime.relatedIds.length === 0) return;
    Promise.all(
      anime.relatedIds.map((id) =>
        fetch(`${API_URL}/api/anime/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((items) =>
      setRelatedItems(
        items.filter((item): item is AnimeDetails => Boolean(item) && !isAnimeHidden(item)),
      ),
    );
  }, [anime.relatedIds]);

  useEffect(() => {
    fetch(`${API_URL}/api/voice-cast/${anime.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setVoiceCast(data))
      .catch(() => {});
  }, [anime.id]);

  const hiddenStudios = parseHiddenStudios(anime.hiddenStudio);
  const readyEpisodes = dbEpisodes.filter(
    (db) => db.status === "ready" && !hiddenStudios.includes(db.studio || "YumekoStudio"),
  );
  const visibleVoiceCast = voiceCast.filter(
    (vc) => !hiddenStudios.includes(vc.studio),
  );
  const studioSet = [
    ...new Set(readyEpisodes.map((db) => db.studio || "YumekoStudio")),
  ];
  const studioList = studioSet.sort((a, b) => {
    if (a === "YumekoStudio") return -1;
    if (b === "YumekoStudio") return 1;
    return a.localeCompare(b);
  });
  const activeStudio = selectedStudio ?? studioList[0] ?? null;

  // ── Watch progress ──
  const [watchProgress, setWatchProgress] = useState<
    Record<
      number,
      {
        watchedSeconds: number;
        totalSeconds: number;
        completed: boolean;
        updatedAt: string;
      }
    >
  >({});
  const [lastWatchedEpId, setLastWatchedEpId] = useState<number | null>(null);

  useEffect(() => {
    if (!auth.user || readyEpisodes.length === 0) return;
    const ids = readyEpisodes.map((e) => e.id);
    fetch(
      `${API_URL}/api/watch-progress/bulk?userId=${auth.user.id}&${ids.map((id) => `episodeIds=${id}`).join("&")}`,
    )
      .then((r) => (r.ok ? r.json() : []))
      .then(
        (
          list: {
            episodeId: number;
            watchedSeconds: number;
            totalSeconds: number;
            completed: boolean;
            updatedAt: string;
          }[],
        ) => {
          const map: Record<
            number,
            {
              watchedSeconds: number;
              totalSeconds: number;
              completed: boolean;
              updatedAt: string;
            }
          > = {};
          list.forEach((wp) => {
            map[wp.episodeId] = wp;
          });
          setWatchProgress(map);

          const inProgress = list.filter(
            (wp) => !wp.completed && wp.watchedSeconds > 0,
          );
          if (inProgress.length > 0) {
            inProgress.sort((a, b) => {
              if (a.updatedAt && b.updatedAt)
                return b.updatedAt.localeCompare(a.updatedAt);
              return b.watchedSeconds - a.watchedSeconds;
            });
            setLastWatchedEpId(inProgress[0].episodeId);
          } else {
            setLastWatchedEpId(null);
          }
        },
      )
      .catch(() => {});
  }, [auth.user, readyEpisodes.length]);

  const episodes = readyEpisodes
    .filter(
      (db) =>
        studioList.length <= 1 ||
        (db.studio || "YumekoStudio") === activeStudio,
    )
    .sort((a, b) => a.number - b.number)
    .map((db) => {
      const num = db.number;
      const wp = watchProgress[db.id];
      const progress =
        wp && wp.totalSeconds > 0 ? wp.watchedSeconds / wp.totalSeconds : 0;
      return {
        num,
        watched: wp?.completed ?? false,
        current: db.id === lastWatchedEpId,
        progress: Math.round(progress * 100),
        name: db.title,
        durationFormatted: db.duration ?? anime.duration,
        preview: bustCache(db.previewUrl, coverCacheKey),
        dbId: db.id,
        hlsUrl: db.hlsUrl,
        studio: db.studio,
      };
    });

  const relatedChronology = [anime, ...relatedItems]
    .filter(
      (item, index, array) =>
        array.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .sort((a, b) => Number(a.year) - Number(b.year) || a.id - b.id)
    .map((item, index) => ({
      ...item,
      order: index + 1,
      isCurrent: item.id === anime.id,
    }));

  // Watch button target: last watched episode, otherwise first episode.
  const watchTargetId = lastWatchedEpId ?? episodes[0]?.dbId ?? null;
  const watchHref = watchTargetId
    ? `/realeses/anime-page/${anime.id}/episodes/${watchTargetId}`
    : undefined;

  const isFavorite = activeStatuses.includes("favorites");
  const currentCollection = COLLECTION_ITEMS.find((c) =>
    activeStatuses.includes(c.key),
  );

  // Hero meta badges built from real data.
  const heroBadges = [
    anime.format,
    anime.season ? `${anime.season}, ${anime.year}` : anime.year,
    anime.studio,
    anime.episodes,
  ].filter(Boolean) as string[];

  // ── Reusable meta rows for the sidebar status card ──
  const metaRows: { label: string; value: string }[] = [
    { label: "Рейтинг", value: anime.rating },
    { label: "Статус", value: anime.status },
    studioList.length > 0
      ? { label: "Озвучка", value: studioList.join(", ") }
      : null,
    anime.episodes ? { label: "Эпизоды", value: anime.episodes } : null,
    {
      label: "Вышел",
      value: anime.season ? `${anime.season}, ${anime.year}` : anime.year,
    },
    anime.format ? { label: "Тип", value: anime.format } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div style={{ fontFamily: '"Manrope", system-ui, sans-serif', color: C.text }}>
      {/* ── TWO-COLUMN LAYOUT ── */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "calc(var(--header-height, 90px) - 0.5rem) 2.5rem 5rem",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 300px",
          gap: "3.5rem",
          alignItems: "start",
        }}
      >
        {/* ── RIGHT SIDEBAR (placed in second grid column) ── */}
        <aside
          style={{
            gridColumn: 2,
            gridRow: 1,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            position: "sticky",
            top: "calc(var(--header-height, 90px) + 1.5rem)",
            alignSelf: "start",
          }}
        >



          {/* Poster */}
          <div
            style={{
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: `0 24px 64px rgba(${C.pageRgb}, 0.6), 0 0 0 1px ${C.border}`,
              position: "relative",
              maxWidth: "260px",
              width: "100%",
              margin: "0 auto",
            }}
          >

            {anime.poster && (
              <img
                src={anime.poster}
                alt={anime.title}
                style={{
                  width: "100%",
                  aspectRatio: "2/3",

                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: C.rose,
                borderRadius: "7px",
                padding: "4px 10px",
                fontSize: "13px",
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              {anime.rating}
            </div>
          </div>

          {/* Watch button */}
          {watchHref ? (
            <Link
              href={watchHref}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: C.rose,
                borderRadius: "8px",
                padding: "9px 20px",
                color: "#fff",
                fontWeight: 700,
                fontSize: "13px",
                boxShadow: `0 4px 20px rgba(${C.roseRgb}, 0.27)`,
                transition: "background 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.roseLight;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.rose;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              {lastWatchedEpId ? "Продолжить" : "Смотреть"}
            </Link>
          ) : (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: C.surface,
                borderRadius: "8px",
                padding: "9px 20px",
                color: C.textMuted,
                fontWeight: 700,
                fontSize: "13px",
                border: `1px solid ${C.border}`,
              }}
            >
              Скоро
            </span>
          )}

          {/* Collection dropdown */}
          <div ref={collectionRef} style={{ position: "relative" }}>
            <button
              onClick={() => (auth.user ? setCollectionOpen((o) => !o) : undefined)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                background: currentCollection ? C.surface : "transparent",
                border: `1px solid ${currentCollection ? C.rose : C.border}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: currentCollection ? C.rose : C.textMuted,
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                transition: "border-color 0.2s, color 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {currentCollection ? (
                <currentCollection.icon size={15} />
              ) : (
                <BookMarked size={15} />
              )}
              {currentCollection ? currentCollection.label : "В коллекцию"}
              <ChevronDown
                size={13}
                style={{
                  transform: collectionOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  opacity: 0.7,
                }}
              />
            </button>

            {collectionOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: C.dropdownBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: `0 12px 40px rgba(${C.pageRgb}, 0.6), 0 0 0 1px rgba(${C.borderRgb}, 0.27)`,
                }}
              >
                {COLLECTION_ITEMS.map(({ key, label, icon: Icon }) => {
                  const isActive = activeStatuses.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        toggleStatus(key);
                        setCollectionOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        background: isActive ? C.surface2 : "transparent",
                        border: "none",
                        borderBottom: `1px solid rgba(${C.borderRgb}, 0.27)`,
                        padding: "11px 16px",
                        color: isActive ? C.rose : C.textSoft,
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "background 0.15s, color 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = C.surface;
                          e.currentTarget.style.color = C.text;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = C.textSoft;
                        }
                      }}
                    >
                      <Icon
                        size={15}
                        style={{ flexShrink: 0, color: isActive ? C.rose : C.roseMuted }}
                      />
                      <span style={{ flex: 1 }}>{label}</span>
                      {isActive && (
                        <Check size={13} style={{ color: C.rose, flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Favourite */}
          <button
            onClick={() => (auth.user ? toggleStatus("favorites") : undefined)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              background: isFavorite ? C.surface : "transparent",
              border: `1px solid ${isFavorite ? C.rose : C.border}`,
              borderRadius: "8px",
              padding: "8px 14px",
              color: isFavorite ? C.rose : C.textMuted,
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isFavorite) {
                e.currentTarget.style.borderColor = C.rose;
                e.currentTarget.style.color = C.rose;
              }
            }}
            onMouseLeave={(e) => {
              if (!isFavorite) {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.textMuted;
              }
            }}
          >
            <Heart size={15} fill={isFavorite ? C.rose : "none"} />
            {isFavorite ? "В избранном" : "В избранное"}
          </button>

          {/* Meta / status card */}
          <div
            style={{
              background: "rgba(18, 16, 20, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >

            {metaRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "1rem",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: C.textMuted, flexShrink: 0 }}>{row.label}</span>
                <span
                  style={{
                    color: C.text,
                    fontWeight: 600,
                    textAlign: "right",
                }}
              >
                {row.value}
                </span>
              </div>
            ))}
          </div>
        </aside>


        {/* ── RIGHT MAIN COLUMN ── */}
        <div style={{ minWidth: 0 }}>
          {/* Format / meta badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            {heroBadges.map((b) => (
              <span
                key={b}
                style={{
                  background: `rgba(${C.borderRgb}, 0.4)`,
                  border: `1px solid ${C.border}`,
                  borderRadius: "4px",
                  padding: "2px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: C.roseText,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {b}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: '"Comfortaa", "Manrope", system-ui, sans-serif',
              fontSize: "clamp(1.9rem, 3.6vw, 3rem)",
              lineHeight: 1.15,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              margin: "0 0 0.4rem",
              color: C.title,
              textShadow: `0 2px 24px rgba(${C.pageRgb}, 0.8)`,
            }}
          >
            {anime.title}
          </h1>
          {anime.altTitle && (
            <p
              style={{
                fontFamily: '"Comfortaa", "Manrope", system-ui, sans-serif',
                color: C.textMuted,
                fontSize: "0.95rem",
                fontWeight: 400,
                margin: "0 0 1rem",
              }}
            >
              {anime.altTitle}
            </p>
          )}

          {/* Genres (moved from sidebar to top) */}
          {genreTags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.4rem",
                margin: "0 0 1.25rem",
              }}
            >
              {genreTags.map((g) => (
                <span
                  key={g}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    border: `1px solid ${C.border}`,
                    fontSize: "12px",
                    color: C.genreText,
                    fontWeight: 600,
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}


          {/* Description */}
          {anime.description && (
            <p
              style={{
                fontSize: "0.9rem",
                color: C.textSoft,
                lineHeight: 1.75,
                margin: "1rem 0 1.5rem",
              }}
            >
              {anime.description}
            </p>
          )}

          {/* Edit / suggest studio actions */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "2rem",
            }}
          >
            {/* Admin edit */}
            {auth.user && (
              <Link

                href={`/realeses/anime-page/edit-anime?id=${anime.id}`}

                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: "8px",
                  padding: "9px 16px",
                  color: C.textMuted,
                  fontWeight: 700,
                  fontSize: "13px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.rose;
                  e.currentTarget.style.color = C.rose;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.textMuted;
                }}
              >
                <Pencil size={15} />
                Редактировать
              </Link>
            )}

            {/* Suggest studio */}
            {auth.user && (
              <button
                onClick={() => setCollabModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: "8px",
                  padding: "9px 16px",
                  color: C.textMuted,
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.rose;
                  e.currentTarget.style.color = C.rose;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.textMuted;
                }}
              >
                <Plus size={15} />
                Предложить студию
              </button>
            )}
          </div>

          {/* TABS */}
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${C.border}`,
              marginBottom: "2rem",
              overflowX: "auto",
            }}
          >
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom:
                    tab === t ? `2px solid ${C.rose}` : "2px solid transparent",
                  padding: "14px 26px",
                  color: tab === t ? C.rose : C.textMuted,
                  fontWeight: tab === t ? 700 : 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  marginBottom: "-1px",
                }}
                onMouseEnter={(e) => {
                  if (tab !== t) e.currentTarget.style.color = C.tabHover;
                }}
                onMouseLeave={(e) => {
                  if (tab !== t) e.currentTarget.style.color = C.textMuted;
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── EPISODES ── */}

        {tab === "Серии" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.75rem",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  margin: 0,
                  color: C.text,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {episodes.length} серий
              </h2>
              {studioList.length > 1 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {studioList.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStudio(s)}
                      style={{
                        background: s === activeStudio ? C.rose : C.card,
                        border: `1px solid ${s === activeStudio ? C.rose : C.border}`,
                        borderRadius: "6px",
                        padding: "6px 16px",
                        color: s === activeStudio ? "#fff" : C.textMuted,
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (s !== activeStudio) {
                          e.currentTarget.style.borderColor = C.rose;
                          e.currentTarget.style.color = C.rose;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (s !== activeStudio) {
                          e.currentTarget.style.borderColor = C.border;
                          e.currentTarget.style.color = C.textMuted;
                        }
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {episodes.length === 0 ? (
              <p style={{ color: C.textMuted, fontSize: "14px", padding: "2rem 0" }}>
                Эпизоды скоро появятся.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {episodes.map((ep) => {
                  const hovered = hoveredEp === ep.dbId;
                  const inner = (
                    <>
                      <div
                        style={{
                          position: "relative",
                          borderRadius: "10px",
                          overflow: "hidden",
                          border: `1px solid ${ep.current ? C.rose : C.border}`,
                          marginBottom: "0.65rem",
                          aspectRatio: "16/9",
                          background: C.card,
                        }}
                      >
                        {ep.preview && (
                          <img
                            src={ep.preview}
                            alt={ep.name ?? `${ep.num} эпизод`}
                            loading="lazy"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                              transition: "transform 0.3s",
                              transform: hovered ? "scale(1.04)" : "scale(1)",
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: `linear-gradient(to bottom, transparent 50%, rgba(${C.pageRgb}, 0.6))`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: hovered ? 1 : 0,
                            transition: "opacity 0.2s",
                          }}
                        >
                          <div
                            style={{
                              background: `rgba(${C.roseRgb}, 0.8)`,
                              borderRadius: "50%",
                              width: "44px",
                              height: "44px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            <svg width="14" height="16" viewBox="0 0 14 16" fill="white">
                              <polygon points="0,0 14,8 0,16" />
                            </svg>
                          </div>
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            bottom: "6px",
                            left: "6px",
                            background: `rgba(${C.pageRgb}, 0.73)`,
                            borderRadius: "5px",
                            padding: "2px 8px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: C.roseText,
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          {ep.num}
                        </div>
                        {ep.watched && (
                          <div
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              background: `rgba(${C.pageRgb}, 0.73)`,
                              borderRadius: "5px",
                              padding: "2px 8px",
                              fontSize: "10px",
                              fontWeight: 700,
                              color: C.rose,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            Просмотрено
                          </div>
                        )}
                        {ep.current && !ep.watched && (
                          <div
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              background: C.rose,
                              borderRadius: "5px",
                              padding: "2px 8px",
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "#fff",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Текущий
                          </div>
                        )}
                        {ep.progress > 0 && !ep.watched && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: "3px",
                              background: `rgba(${C.pageRgb}, 0.53)`,
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${ep.progress}%`,
                                background: C.rose,
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <p
                        style={{
                          margin: "0 0 3px",
                          fontWeight: 700,
                          fontSize: "13px",
                          color: C.text,
                          lineHeight: 1.35,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {ep.name || `${ep.num} эпизод`}
                      </p>
                      <span style={{ fontSize: "11px", color: C.roseMuted, fontWeight: 600 }}>
                        {ep.durationFormatted}
                      </span>
                    </>
                  );

                  const cardStyle: React.CSSProperties = {
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    display: "block",
                    color: "inherit",
                  };

                  return ep.dbId ? (
                    <Link
                      key={ep.dbId}
                      href={`/realeses/anime-page/${anime.id}/episodes/${ep.dbId}`}
                      style={cardStyle}
                      onMouseEnter={() => setHoveredEp(ep.dbId)}
                      onMouseLeave={() => setHoveredEp(null)}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={ep.num} style={cardStyle}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CAST ── */}
        {tab === "Актёры" &&
          (() => {
            const castStudios = [...new Set(visibleVoiceCast.map((vc) => vc.studio))];
            const showStudio =
              activeStudio && castStudios.includes(activeStudio)
                ? activeStudio
                : castStudios[0];
            const filtered = visibleVoiceCast.filter((vc) => vc.studio === showStudio);
            return (
              <div>
                <h2
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    margin: "0 0 1.5rem",
                    color: C.title,
                  }}
                >
                  Голосовые актёры
                  {showStudio ? ` — ${showStudio}` : ""}
                </h2>

                {filtered.length === 0 ? (
                  <p style={{ color: C.textMuted, fontSize: "14px" }}>
                    Информация об актёрах пока не добавлена.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    {filtered.map((vc) => {
                      const inner = (
                        <>
                          <div
                            style={{
                              width: "56px",
                              height: "56px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              flexShrink: 0,
                              border: `2px solid ${vc.actorRoleColor ?? C.border}`,
                              background: C.surface,
                            }}
                          >
                            {vc.actorUsername && vc.actorHasAvatar && (
                              <img
                                src={`${API_URL}/api/media/${vc.actorUsername}/avatar`}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                margin: "0 0 2px",
                                fontWeight: 700,
                                fontSize: "14px",
                                color: vc.actorRoleColor ?? C.text,
                              }}
                            >
                              {vc.actorDisplayName || vc.actorName}
                            </p>
                            <p
                              style={{
                                margin: "0 0 2px",
                                fontSize: "12px",
                                color: C.roseText,
                                fontWeight: 600,
                              }}
                            >
                              {vc.characterName}
                            </p>
                            <span style={{ fontSize: "11px", color: C.textMuted }}>
                              {vc.actorUsername ? `@${vc.actorUsername}` : vc.studio}
                            </span>
                          </div>
                        </>
                      );
                      const cardStyle: React.CSSProperties = {
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: "10px",
                        padding: "1rem",
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        textDecoration: "none",
                        color: "inherit",
                      };
                      return vc.actorUsername ? (
                        <Link
                          key={vc.id}
                          href={`/profile/${vc.actorUsername}`}
                          style={cardStyle}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = `rgba(${C.roseRgb}, 0.27)`;
                            e.currentTarget.style.background = C.surface;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.background = C.card;
                          }}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div key={vc.id} style={cardStyle}>
                          {inner}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        {/* ── CONNECTED ── */}
        {tab === "Связанное" && (
          <div>
            <h2
              style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                margin: "0 0 1.5rem",
                color: C.title,
              }}
            >
              Связанные релизы
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {relatedChronology.map((item) => (
                <Link
                  key={item.id}
                  href={`/realeses/anime-page/${item.id}`}
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    display: "block",
                    color: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      borderRadius: "9px",
                      overflow: "hidden",
                      position: "relative",
                      marginBottom: "0.65rem",
                      border: `1px solid ${item.isCurrent ? C.rose : C.border}`,
                      background: C.card,
                    }}
                  >
                    {item.poster && (
                      <img
                        src={item.poster}
                        alt={item.title}
                        style={{
                          width: "100%",
                          aspectRatio: "5/7",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        background: C.rose,
                        borderRadius: "5px",
                        padding: "2px 8px",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      {item.rating}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: `linear-gradient(to top, rgba(${C.pageRgb}, 0.8), transparent)`,
                        padding: "8px 8px 6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: C.rose,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {item.isCurrent ? "Текущий" : item.format}
                      </span>
                    </div>
                  </div>
                  <p
                    style={{
                      margin: "0 0 3px",
                      fontWeight: 700,
                      fontSize: "12px",
                      color: C.text,
                      lineHeight: 1.35,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.title}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: C.textMuted }}>
                    {item.year}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        </div>
      </div>

      {/* ── COMMENTS (full width, below everything) ── */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 2.5rem 5rem",
        }}
      >
        <h2
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: "1.75rem",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            margin: "0 0 1.5rem",
            color: C.title,
          }}
        >
          Комментарии
        </h2>

        <Comments animeId={anime.id} accent={C.rose} />
      </div>


      {/* ── Collaboration request modal ── */}

      {collabModalOpen && (
        <div
          className={styles.collabModalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCollabModalOpen(false);
          }}
        >
          <div className={`${styles.collabModal} ${styles.collabModalTop}`}>

            <div className={styles.collabModalHeader}>
              <h2>Предложить студию озвучки</h2>
              <button
                className={styles.collabModalClose}
                onClick={() => setCollabModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitCollab();
              }}
              className={styles.collabForm}
            >
              <div className={styles.formGroup}>
                <label>Название студии *</label>
                <input
                  type="text"
                  value={collabForm.name}
                  onChange={(e) => setCollabForm({ ...collabForm, name: e.target.value })}
                  required
                  placeholder="Название вашей студии"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Описание студии</label>
                <textarea
                  value={collabForm.description}
                  onChange={(e) =>
                    setCollabForm({ ...collabForm, description: e.target.value })
                  }
                  placeholder="Расскажите о вашей студии..."
                />
              </div>
              <div className={styles.formGroup}>
                <label>Глава студии</label>
                <div className={styles.headUsernameDisplay}>
                  @{auth.user?.username}
                  <span className={styles.headUsernameNote}>
                    — ваш профиль привязан автоматически
                  </span>
                </div>
              </div>
              <ImageUploadField
                label="Аватар студии"
                value={collabForm.avatar}
                onChange={(url) => setCollabForm({ ...collabForm, avatar: url })}
                placeholder="https://example.com/avatar.png"
              />
              <ImageUploadField
                label="Баннер студии"
                value={collabForm.banner}
                onChange={(url) => setCollabForm({ ...collabForm, banner: url })}
                placeholder="https://example.com/banner.jpg"
              />
              <div className={styles.formGroup}>
                <label>Соцсети</label>
                <textarea
                  value={collabForm.socials}
                  onChange={(e) => setCollabForm({ ...collabForm, socials: e.target.value })}
                  placeholder="Discord: https://discord.gg/...&#10;Telegram: https://t.me/..."
                />
              </div>
              <div className={styles.formGroup}>
                <label>Контакт для модерации *</label>
                <input
                  type="text"
                  value={collabForm.contact}
                  onChange={(e) => setCollabForm({ ...collabForm, contact: e.target.value })}
                  required
                  placeholder="@username или email"
                />
              </div>
              <div className={styles.collabFormActions}>
                <button
                  type="submit"
                  disabled={collabSubmitting}
                  className={styles.collabSubmitBtn}
                >
                  {collabSubmitting ? "Отправка..." : "Отправить на модерацию"}
                </button>
                <button
                  type="button"
                  onClick={() => setCollabModalOpen(false)}
                  className={styles.collabCancelBtn}
                >
                  Отмена
                </button>
              </div>
              {collabError && <div className={styles.collabError}>{collabError}</div>}
            </form>
          </div>
        </div>
      )}

      {collabSuccessOpen && (
        <div
          className={styles.collabModalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCollabSuccessOpen(false);
          }}
        >
          <div className={`${styles.collabModal} ${styles.collabSuccessModal}`}>

            <button
              className={styles.collabSuccessClose}
              onClick={() => setCollabSuccessOpen(false)}
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
            <div className={styles.collabSuccessIcon}>
              <Check size={26} />
            </div>
            <h2 className={styles.collabSuccessTitle}>Запрос отправлен</h2>
            <p className={styles.requestSentText}>
              Студия <strong>«{collabSuccessStudio}»</strong> отправлена на модерацию.
              Ожидайте решения.
            </p>
            <button
              type="button"
              className={styles.collabSubmitBtn}
              onClick={() => setCollabSuccessOpen(false)}
            >
              Понятно
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

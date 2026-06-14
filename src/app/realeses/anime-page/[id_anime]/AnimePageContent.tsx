"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  Play,
  Heart,
  BookMarked,
  ChevronRight,
  ChevronDown,
  Clock,
  List,
  LayoutGrid,
  Eye,
  CalendarClock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Mic,
  Plus,
  Pencil,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAccent, type AnimeDetails, parseHiddenStudios, isAnimeHidden } from "@/data/anime";
import { API_URL } from "@/config/hosts";
import styles from "./page.module.scss";
import Comments from "./Comments";

type Tab = "episodes" | "related" | "comments";

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

function parseEpisodeCount(str: string): number {
  const m = str.match(/\d+/);
  return m ? Math.min(parseInt(m[0]), 24) : 1;
}

function parseDurationMinutes(str: string): number {
  const m = str.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

const COLLECTION_ITEMS = [
  { key: "watching", label: "Смотрю", icon: Eye },
  { key: "planned", label: "Запланировано", icon: CalendarClock },
  { key: "completed", label: "Просмотрено", icon: CheckCircle2 },
  { key: "onhold", label: "Отложено", icon: PauseCircle },
  { key: "dropped", label: "Брошено", icon: XCircle },
] as const;

export default function AnimePageContent({
  anime,
  accent,
  dbEpisodes = [],
}: Props) {
  const auth = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("episodes");
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collabSubmitting, setCollabSubmitting] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
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
  const [epView, setEpView] = useState<"list" | "grid">("grid");
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);
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
        setCollabForm({
          name: "",
          description: "",
          headUsername: "",
          avatar: "",
          banner: "",
          socials: "",
          contact: "",
        });
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

          // Find the most recently watched non-completed episode
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
        preview: db.previewUrl,
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
  const relatedStartYear = relatedChronology[0]?.year ?? anime.year;
  const relatedEndYear =
    relatedChronology[relatedChronology.length - 1]?.year ?? anime.year;
  const totalRelatedEpisodes = relatedChronology.reduce(
    (sum, item) => sum + parseEpisodeCount(item.episodes),
    0,
  );
  const totalRelatedMinutes = relatedChronology.reduce(
    (sum, item) =>
      sum +
      parseEpisodeCount(item.episodes) * parseDurationMinutes(item.duration),
    0,
  );
  const relatedHours = Math.floor(totalRelatedMinutes / 60);
  const relatedMinutes = totalRelatedMinutes % 60;

  const tabs: [Tab, string][] = [
    ["episodes", "Эпизоды"],
    ["related", "Связанное"],
    ["comments", "Комментарии"],
  ];

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <nav className={styles.breadcrumb}>
        <Link href="/">Главная</Link>
        <ChevronRight size={13} />
        <Link href="/releases">Релизы</Link>
        <ChevronRight size={13} />
        <span>{anime.title}</span>
      </nav>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        {/* Poster */}
        <div
          className={styles.poster}
          style={{ ["--accent-color" as string]: accent }}
        >
          {anime.poster && (
            <img
              src={anime.poster}
              alt={anime.title}
              className={styles.posterImg}
              loading="lazy"
            />
          )}
          <div className={styles.posterTop}>
            <span className={styles.ratingTag}>{anime.rating}</span>
          </div>
          <div className={styles.posterGlow} />
        </div>

        {/* Info */}
        <div className={styles.heroInfo}>
          <h1 className={styles.title}>{anime.title}</h1>
          <p className={styles.altTitle}>{anime.altTitle}</p>

          <div className={styles.heroBadges}>
            <span
              className={`${styles.ageTag} ${styles[`age${anime.rating.replace("+", "")}`] ?? ""}`}
            >
              {anime.rating}
            </span>
            <span
              className={styles.statusBadge}
              style={{ color: accent, borderColor: `${accent}40` }}
            >
              {anime.status}
            </span>
            <span className={styles.formatBadge}>{anime.format}</span>
          </div>

          <dl className={styles.infoTable}>
            <div className={styles.infoRow}>
              <dt>Тип</dt>
              <dd>{anime.format}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Сезон</dt>
              <dd>
                {anime.season}, {anime.year}г.
              </dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Жанры</dt>
              <dd>
                {genreTags.map((g, i) => (
                  <span key={g}>
                    <span>{g}</span>
                    {i < genreTags.length - 1 && (
                      <span className={styles.sep}>, </span>
                    )}
                  </span>
                ))}
              </dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Студия</dt>
              <dd>{anime.studio}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Длительность</dt>
              <dd>{anime.duration} / эп.</dd>
            </div>
            {studioList.length > 0 && (
              <div className={styles.infoRow}>
                <dt>Озвучено</dt>
                <dd>{studioList.join(", ")}</dd>
              </div>
            )}
          </dl>

          <div className={styles.actions}>
            {/* Edit button for admins */}
            {auth.user && auth.user.role?.priority >= 80 && (
              <Link
                href={`/admin/create-anime?id=${anime.id}`}
                className={styles.editBtn}
                title="Редактировать аниме"
              >
                <Pencil size={16} />
              </Link>
            )}

            {/* Collaboration request button */}
            {auth.user && (
              <button
                className={styles.collabBtn}
                onClick={() => setCollabModalOpen(true)}
                title="Предложить студию озвучки"
              >
                <Plus size={16} />
              </button>
            )}

            <div className={styles.collectionWrap} ref={collectionRef}>
              <button
                className={`${styles.collectionBtn} ${activeStatuses.some((s) => s !== "favorites") ? styles.collectionBtnActive : ""}`}
                onClick={() =>
                  auth.user ? setCollectionOpen(!collectionOpen) : undefined
                }
              >
                {(() => {
                  const currentList = COLLECTION_ITEMS.find((c) =>
                    activeStatuses.includes(c.key),
                  );
                  if (currentList) {
                    const Icon = currentList.icon;
                    return (
                      <>
                        <Icon size={15} /> {currentList.label}
                      </>
                    );
                  }
                  return (
                    <>
                      <BookMarked size={15} /> Добавить в список
                    </>
                  );
                })()}
                <ChevronDown
                  size={14}
                  className={collectionOpen ? styles.chevronOpen : ""}
                />
              </button>
              {collectionOpen && (
                <div className={styles.collectionDropdown}>
                  {COLLECTION_ITEMS.map((item) => {
                    const active = activeStatuses.includes(item.key);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        className={`${styles.dropdownItem} ${active ? styles.dropdownItemActive : ""}`}
                        onClick={() => toggleStatus(item.key)}
                      >
                        <Icon size={15} /> {item.label}
                        {active && (
                          <CheckCircle2
                            size={14}
                            className={styles.dropdownCheck}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              className={`${styles.iconBtn} ${activeStatuses.includes("favorites") ? styles.iconBtnActive : ""}`}
              aria-label="В избранное"
              onClick={() =>
                auth.user ? toggleStatus("favorites") : undefined
              }
            >
              <Heart
                size={16}
                fill={
                  activeStatuses.includes("favorites") ? "currentColor" : "none"
                }
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      <div className={styles.descBlock}>
        <p className={styles.description}>{anime.description}</p>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabsRow}>
        <div className={styles.tabs}>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? styles.tabActive : styles.tab}
              onClick={() => setTab(key)}
              style={
                tab === key ? { ["--tab-accent" as string]: accent } : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "episodes" && (
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${epView === "list" ? styles.viewBtnActive : ""}`}
              onClick={() => setEpView("list")}
              aria-label="Список"
            >
              <List size={16} />
            </button>
            <button
              className={`${styles.viewBtn} ${epView === "grid" ? styles.viewBtnActive : ""}`}
              onClick={() => setEpView("grid")}
              aria-label="Карточки"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Studio tabs ── */}
      {tab === "episodes" && studioList.length > 1 && (
        <div className={styles.studioTabs}>
          {studioList.map((s) => (
            <button
              key={s}
              className={`${styles.studioTab} ${s === activeStudio ? styles.studioTabActive : ""}`}
              onClick={() => setSelectedStudio(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab: Episodes ── */}
      {tab === "episodes" && epView === "list" && (
        <div className={styles.episodesList}>
          {episodes.map((ep) => {
            const epHref = ep.dbId
              ? `/realeses/anime-page/${anime.id}/episodes/${ep.dbId}`
              : undefined;
            const rowContent = (
              <>
                <span className={styles.epNumber}>{ep.num}</span>
                <div className={styles.epRowInfo}>
                  <span className={styles.epRowTitle}>
                    {ep.name || `${ep.num} эпизод`}
                  </span>
                  <span className={styles.epRowDuration}>
                    {ep.durationFormatted}
                  </span>
                </div>
                <div className={styles.epRowRight}>
                  {ep.watched && (
                    <span className={styles.epRowWatched}>Просмотрено</span>
                  )}
                  {ep.current && (
                    <span
                      className={styles.epRowCurrentLabel}
                      style={{ color: "var(--accent)" }}
                    >
                      Текущий
                    </span>
                  )}
                  <Play size={16} className={styles.epRowPlay} />
                </div>
                {ep.progress > 0 && !ep.watched && (
                  <div className={styles.epRowProgress}>
                    <div
                      className={styles.epRowProgressBar}
                      style={{
                        width: `${ep.progress}%`,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                )}
              </>
            );
            return epHref ? (
              <Link
                key={ep.dbId}
                href={epHref}
                className={`${styles.epRow} ${ep.current ? styles.epRowCurrent : ""}`}
                style={
                  ep.current
                    ? { ["--ep-accent" as string]: "var(--accent)" }
                    : undefined
                }
              >
                {rowContent}
              </Link>
            ) : (
              <div
                key={ep.dbId}
                className={`${styles.epRow} ${ep.current ? styles.epRowCurrent : ""}`}
                style={
                  ep.current
                    ? { ["--ep-accent" as string]: "var(--accent)" }
                    : undefined
                }
              >
                {rowContent}
              </div>
            );
          })}
        </div>
      )}

      {tab === "episodes" && epView === "grid" && (
        <div className={styles.episodesGrid}>
          {episodes.map((ep) => {
            const epHref = ep.dbId
              ? `/realeses/anime-page/${anime.id}/episodes/${ep.dbId}`
              : undefined;
            const cardContent = (
              <div className={styles.epCardThumb}>
                {ep.preview && (
                  <img
                    src={ep.preview}
                    alt={ep.name ?? `${ep.num} эпизод`}
                    className={styles.epCardThumbImg}
                    loading="lazy"
                  />
                )}
                {ep.current && (
                  <span
                    className={styles.epCardDot}
                    style={{ background: "var(--accent)" }}
                  />
                )}
                {ep.watched && (
                  <span className={styles.epCardWatched}>Просмотрено</span>
                )}
                {ep.current && (
                  <span
                    className={styles.epCardCurrentLabel}
                    style={{ color: "var(--accent)" }}
                  >
                    Текущий
                  </span>
                )}
                <div className={styles.epCardInfo}>
                  {ep.name && (
                    <span className={styles.epCardTitle}>{ep.name}</span>
                  )}
                  <span className={styles.epCardNum}>{ep.num} эпизод</span>
                </div>
                <span className={styles.epCardDuration}>
                  {ep.durationFormatted}
                </span>
                {ep.progress > 0 && !ep.watched && (
                  <div className={styles.epCardProgress}>
                    <div
                      className={styles.epCardProgressBar}
                      style={{
                        width: `${ep.progress}%`,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                )}
              </div>
            );
            return epHref ? (
              <Link
                key={ep.dbId}
                href={epHref}
                className={`${styles.epCard} ${ep.current ? styles.epCardCurrent : ""} ${ep.watched ? styles.epCardWatchedState : ""}`}
                style={
                  ep.current
                    ? { ["--ep-accent" as string]: "var(--accent)" }
                    : undefined
                }
              >
                {cardContent}
              </Link>
            ) : (
              <div
                key={ep.dbId}
                className={`${styles.epCard} ${ep.current ? styles.epCardCurrent : ""} ${ep.watched ? styles.epCardWatchedState : ""}`}
                style={
                  ep.current
                    ? { ["--ep-accent" as string]: "var(--accent)" }
                    : undefined
                }
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Voice Cast ── */}
      {tab === "episodes" &&
        visibleVoiceCast.length > 0 &&
        (() => {
          const castStudios = [...new Set(visibleVoiceCast.map((vc) => vc.studio))];
          const showStudio =
            activeStudio && castStudios.includes(activeStudio)
              ? activeStudio
              : castStudios[0];
          const filtered = visibleVoiceCast.filter((vc) => vc.studio === showStudio);
          if (filtered.length === 0) return null;
          return (
            <div className={styles.voiceCastSection}>
              <h3 className={styles.voiceCastTitle}>
                <Mic size={15} />
                Озвучка — {showStudio}
              </h3>
              <div className={styles.voiceCastGrid}>
                {filtered.map((vc) => {
                  const inner = (
                    <>
                      {vc.actorUsername && vc.actorHasAvatar ? (
                        <img
                          src={`${API_URL}/api/media/${vc.actorUsername}/avatar`}
                          alt=""
                          className={styles.voiceCastAvatar}
                          style={
                            vc.actorRoleColor
                              ? { borderColor: vc.actorRoleColor }
                              : undefined
                          }
                        />
                      ) : (
                        <div className={styles.voiceCastAvatarEmpty} />
                      )}
                      <div className={styles.voiceCastInfo}>
                        <div className={styles.voiceCastActorRow}>
                          <span
                            className={styles.voiceCastActor}
                            style={
                              vc.actorRoleColor
                                ? { color: vc.actorRoleColor }
                                : undefined
                            }
                          >
                            {vc.actorDisplayName || vc.actorName}
                          </span>
                          {vc.actorUsername && (
                            <span className={styles.voiceCastHandle}>
                              @{vc.actorUsername}
                            </span>
                          )}
                        </div>
                        <span className={styles.voiceCastCharacter}>
                          → {vc.characterName}
                        </span>
                      </div>
                    </>
                  );
                  return vc.actorUsername ? (
                    <Link
                      key={vc.id}
                      href={`/profile/${vc.actorUsername}`}
                      className={styles.voiceCastItem}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={vc.id} className={styles.voiceCastItem}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {tab === "related" && (
        <div className={styles.relatedTimeline}>
          <div className={styles.relatedTimelineHeader}>
            <h3 className={styles.relatedTimelineTitle}>{anime.title}</h3>
            <p className={styles.relatedTimelineSubtitle}>{anime.altTitle}</p>
            <p className={styles.relatedTimelineMeta}>
              {relatedStartYear}
              {relatedEndYear !== relatedStartYear
                ? ` — ${relatedEndYear}`
                : ""}
              {` • ${relatedChronology.length} релизов • ${totalRelatedEpisodes} эпизодов • ${relatedHours} ч ${relatedMinutes} мин`}
            </p>
          </div>

          <div className={styles.relatedTimelineList}>
            {relatedChronology.map((item) => {
              const itemAccent = getAccent(item.rating);

              return (
                <Link
                  key={item.id}
                  href={`/realeses/anime-page/${item.id}`}
                  className={`${styles.relatedTimelineRow} ${item.isCurrent ? styles.relatedTimelineRowCurrent : ""}`}
                  style={
                    item.isCurrent
                      ? { ["--related-current-accent" as string]: itemAccent }
                      : undefined
                  }
                >
                  <div
                    className={styles.relatedTimelinePoster}
                    style={{ ["--related-accent" as string]: itemAccent }}
                  />

                  <div className={styles.relatedTimelineContent}>
                    <p className={styles.relatedTimelineName}>{item.title}</p>
                    <p className={styles.relatedTimelineAlt}>{item.altTitle}</p>
                    <p className={styles.relatedTimelineItemMeta}>
                      {item.year} • {item.season} • {item.format} •{" "}
                      {item.episodes}
                    </p>
                  </div>

                  <span className={styles.relatedTimelineIndex}>
                    #{item.order}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {tab === "comments" && <Comments animeId={anime.id} accent={accent} />}

      {/* Collaboration request modal */}
      {collabModalOpen && (
        <div className={styles.collabModalOverlay} onClick={() => setCollabModalOpen(false)}>
          <div className={styles.collabModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.collabModalHeader}>
              <h2>Предложить студию озвучки</h2>
              <button className={styles.collabModalClose} onClick={() => setCollabModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitCollab(); }} className={styles.collabForm}>
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
                  onChange={(e) => setCollabForm({ ...collabForm, description: e.target.value })}
                  placeholder="Расскажите о вашей студии..."
                />
              </div>
              <div className={styles.formGroup}>
                <label>Глава студии (@username) *</label>
                <input
                  type="text"
                  value={collabForm.headUsername}
                  onChange={(e) => setCollabForm({ ...collabForm, headUsername: e.target.value.replace("@", "") })}
                  required
                  placeholder="@username"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Аватар (URL)</label>
                <input
                  type="text"
                  value={collabForm.avatar}
                  onChange={(e) => setCollabForm({ ...collabForm, avatar: e.target.value })}
                  placeholder="https://example.com/avatar.png"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Баннер (URL)</label>
                <input
                  type="text"
                  value={collabForm.banner}
                  onChange={(e) => setCollabForm({ ...collabForm, banner: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
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
                <button type="submit" disabled={collabSubmitting} className={styles.collabSubmitBtn}>
                  {collabSubmitting ? "Отправка..." : "Отправить на модерацию"}
                </button>
                <button type="button" onClick={() => setCollabModalOpen(false)} className={styles.collabCancelBtn}>
                  Отмена
                </button>
              </div>
              {collabError && <div className={styles.collabError}>{collabError}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

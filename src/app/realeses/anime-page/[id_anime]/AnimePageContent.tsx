"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Heart, BookMarked, ChevronRight, ChevronDown, Clock, List, LayoutGrid, Eye, CalendarClock, CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { animeCatalog, getAccent, type AnimeDetails } from "@/data/anime";
import styles from "./page.module.scss";

type Tab = "episodes" | "related" | "comments";

export interface ApiEpisode {
  ordinal: number;
  name: string | null;
  duration: number;
  preview: string | null;
}

interface Props {
  anime: AnimeDetails;
  accent: string;
  apiEpisodes?: ApiEpisode[];
}

function parseEpisodeCount(str: string): number {
  const m = str.match(/\d+/);
  return m ? Math.min(parseInt(m[0]), 24) : 1;
}

function parseDurationMinutes(str: string): number {
  const m = str.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AnimePageContent({ anime, accent, apiEpisodes = [] }: Props) {
  const [tab, setTab] = useState<Tab>("episodes");
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [epView, setEpView] = useState<"list" | "grid">("grid");
  const genreTags = anime.genres.split(" • ");
  const epCount = parseEpisodeCount(anime.episodes);
  const currentEp = parseInt(anime.ep.match(/\d+/)?.[0] ?? "1");
  const relatedItems = anime.relatedIds
    .map((id) => animeCatalog.find((item) => item.id === id))
    .filter((item): item is AnimeDetails => item !== undefined);

  const hasApi = apiEpisodes.length > 0;
  const episodeCount = hasApi ? apiEpisodes.length : epCount;

  const episodes = Array.from({ length: episodeCount }, (_, i) => {
    const num = i + 1;
    const api = hasApi ? apiEpisodes[i] : null;
    let watched = false;
    let current = false;
    let progress = 0;
    if (num === 1) { watched = true; progress = 0; }
    else if (num === 2) { watched = false; current = false; progress = 8; }
    else if (num === 3) { watched = false; current = false; progress = 50; }
    else if (num === 4) { watched = false; current = true; progress = 35; }
    else if (num <= currentEp - 1) { watched = false; progress = 0; }
    else if (num === currentEp) { watched = false; current = false; progress = 0; }
    return {
      num,
      watched,
      current,
      progress,
      name: api?.name ?? null,
      durationFormatted: api ? formatDuration(api.duration) : anime.duration,
      preview: api?.preview ?? null,
    };
  });

  const relatedChronology = [anime, ...relatedItems]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => Number(a.year) - Number(b.year) || a.id - b.id)
    .map((item, index) => ({
      ...item,
      order: index + 1,
      isCurrent: item.id === anime.id,
    }));
  const relatedStartYear = relatedChronology[0]?.year ?? anime.year;
  const relatedEndYear = relatedChronology[relatedChronology.length - 1]?.year ?? anime.year;
  const totalRelatedEpisodes = relatedChronology.reduce((sum, item) => sum + parseEpisodeCount(item.episodes), 0);
  const totalRelatedMinutes = relatedChronology.reduce(
    (sum, item) => sum + parseEpisodeCount(item.episodes) * parseDurationMinutes(item.duration),
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
        <div className={styles.poster} style={{ ["--accent-color" as string]: accent }}>
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
            <span className={`${styles.ageTag} ${styles[`age${anime.rating.replace('+', '')}`] ?? ""}`}>
              {anime.rating}
            </span>
            <span className={styles.statusBadge} style={{ color: accent, borderColor: `${accent}40` }}>
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
              <dd>{anime.season}, {anime.year}г.</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Жанры</dt>
              <dd>
                {genreTags.map((g, i) => (
                  <span key={g}>
                    <span>{g}</span>
                    {i < genreTags.length - 1 && <span className={styles.sep}>, </span>}
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
          </dl>

          <div className={styles.actions}>
            <div className={styles.collectionWrap}>
              <button
                className={styles.collectionBtn}
                onClick={() => setCollectionOpen(!collectionOpen)}
              >
                <BookMarked size={15} />
                Добавить в список
                <ChevronDown size={14} className={collectionOpen ? styles.chevronOpen : ''} />
              </button>
              {collectionOpen && (
                <div className={styles.collectionDropdown}>
                  <button className={styles.dropdownItem}>
                    <Eye size={15} /> Смотрю
                  </button>
                  <button className={styles.dropdownItem}>
                    <CalendarClock size={15} /> Запланировано
                  </button>
                  <button className={styles.dropdownItem}>
                    <CheckCircle2 size={15} /> Просмотрено
                  </button>
                  <button className={styles.dropdownItem}>
                    <PauseCircle size={15} /> Отложено
                  </button>
                  <button className={styles.dropdownItem}>
                    <XCircle size={15} /> Брошено
                  </button>
                </div>
              )}
            </div>
            <button className={styles.iconBtn} aria-label="В избранное">
              <Heart size={16} />
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
              style={tab === key ? { ["--tab-accent" as string]: accent } : undefined}
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

      {/* ── Tab: Episodes ── */}
      {tab === "episodes" && epView === "list" && (
        <div className={styles.episodesList}>
          {episodes.map((ep) => (
            <div
              key={ep.num}
              className={`${styles.epRow} ${ep.current ? styles.epRowCurrent : ""}`}
              style={ep.current ? { ["--ep-accent" as string]: "var(--accent)" } : undefined}
            >
              <span className={styles.epNumber}>{ep.num}</span>
              <div className={styles.epRowInfo}>
                <span className={styles.epRowTitle}>{ep.name || `${ep.num} эпизод`}</span>
                <span className={styles.epRowDuration}>{ep.durationFormatted}</span>
              </div>
              <div className={styles.epRowRight}>
                {ep.watched && <span className={styles.epRowWatched}>Просмотрено</span>}
                {ep.current && <span className={styles.epRowCurrentLabel} style={{ color: 'var(--accent)' }}>Текущий</span>}
                <Play size={16} className={styles.epRowPlay} />
              </div>
              {ep.progress > 0 && (
                <div className={styles.epRowProgress}>
                  <div
                    className={styles.epRowProgressBar}
                    style={{ width: `${ep.progress}%`, background: ep.watched ? 'var(--text-muted)' : 'var(--accent)' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "episodes" && epView === "grid" && (
        <div className={styles.episodesGrid}>
          {episodes.map((ep) => (
            <div
              key={ep.num}
              className={`${styles.epCard} ${ep.current ? styles.epCardCurrent : ""} ${ep.watched ? styles.epCardWatchedState : ""}`}
              style={ep.current ? { ["--ep-accent" as string]: "var(--accent)" } : undefined}
            >
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
                  <span className={styles.epCardDot} style={{ background: 'var(--accent)' }} />
                )}
                {ep.watched && <span className={styles.epCardWatched}>Просмотрено</span>}
                {ep.current && <span className={styles.epCardCurrentLabel} style={{ color: 'var(--accent)' }}>Текущий</span>}
                <div className={styles.epCardInfo}>
                  {ep.name && <span className={styles.epCardTitle}>{ep.name}</span>}
                  <span className={styles.epCardNum}>{ep.num} эпизод</span>
                </div>
                <span className={styles.epCardDuration}>{ep.durationFormatted}</span>
                {ep.progress > 0 && (
                  <div className={styles.epCardProgress}>
                    <div
                      className={styles.epCardProgressBar}
                      style={{ width: `${ep.progress}%`, background: ep.watched ? 'rgba(255,255,255,0.3)' : 'var(--accent)' }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "related" && (
        <div className={styles.relatedTimeline}>
          <div className={styles.relatedTimelineHeader}>
            <h3 className={styles.relatedTimelineTitle}>{anime.title}</h3>
            <p className={styles.relatedTimelineSubtitle}>{anime.altTitle}</p>
            <p className={styles.relatedTimelineMeta}>
              {relatedStartYear}
              {relatedEndYear !== relatedStartYear ? ` — ${relatedEndYear}` : ""}
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
                  style={item.isCurrent ? { ["--related-current-accent" as string]: itemAccent } : undefined}
                >
                  <div className={styles.relatedTimelinePoster} style={{ ["--related-accent" as string]: itemAccent }} />

                  <div className={styles.relatedTimelineContent}>
                    <p className={styles.relatedTimelineName}>{item.title}</p>
                    <p className={styles.relatedTimelineAlt}>{item.altTitle}</p>
                    <p className={styles.relatedTimelineItemMeta}>
                      {item.year} • {item.season} • {item.format} • {item.episodes}
                    </p>
                  </div>

                  <span className={styles.relatedTimelineIndex}>#{item.order}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {tab === "comments" && (
        <div className={styles.emptyTab}>Комментариев пока нет</div>
      )}

    </div>
  );
}

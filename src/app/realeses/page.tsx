"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header/Header";
import { type AnimeDetails, getAccent, isAnimeHidden } from "@/data/anime";
import { API_URL } from "@/config/hosts";
import styles from "./catalog.module.scss";

const PER_PAGE = 24;

type TypeFilter = "all" | "anime" | "films" | "cartoons" | "serials" | "hentai";

const CATEGORY_TABS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "anime", label: "Аниме" },
  { key: "films", label: "Фильмы" },
  { key: "cartoons", label: "Мультфильмы" },
  { key: "serials", label: "Сериалы" },
  { key: "hentai", label: "Хентай" },
];

function matchesType(a: AnimeDetails, type: TypeFilter): boolean {
  if (type === "all") return true;
  const genres = a.genres ? a.genres.split(",").map((g) => g.trim()).filter(Boolean) : [];
  const fmt = a.format?.trim() ?? "";

  const isCartoon = genres.includes("Мультфильм") || fmt === "Мультфильм";
  const isFilm = genres.includes("Фильм") || fmt === "Фильм";

  const isSerial = genres.includes("Сериал") || fmt === "Сериал";
  const isHentai = genres.includes("Хентай") || fmt === "Хентай";

  if (type === "cartoons") return isCartoon;
  if (type === "films") return isFilm && !isCartoon;
  if (type === "serials") return isSerial;
  if (type === "hentai") return isHentai;
  if (type === "anime") {
    if (isCartoon || isFilm || isSerial || isHentai) return false;
    return (
      genres.includes("Аниме") || ["ТВ", "OVA", "ONA", "Спешл"].includes(fmt)
    );
  }
  return true;
}

export default function CatalogPage() {
  const [anime, setAnime] = useState<AnimeDetails[]>([]);
  const [studioMap, setStudioMap] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [studio, setStudio] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [ar, vcr, epr, str] = await Promise.all([
          fetch(`${API_URL}/api/anime`),
          fetch(`${API_URL}/api/voice-cast/studio-map`),
          fetch(`${API_URL}/api/episodes/studio-map`),
          fetch(`${API_URL}/api/studios`),
        ]);
        if (ar.ok) {
          const data: AnimeDetails[] = await ar.json();
          setAnime(data.filter((anime) => !isAnimeHidden(anime)));
        }
        const vcMap: Record<string, number[]> = vcr.ok ? await vcr.json() : {};
        const epMap: Record<string, number[]> = epr.ok ? await epr.json() : {};
        const merged: Record<string, number[]> = { ...vcMap };
        for (const [s, ids] of Object.entries(epMap)) {
          const existing = merged[s] || [];
          merged[s] = [...new Set([...existing, ...ids])].sort((a, b) => a - b);
        }
        
        // Filter out inactive studios (keep YumekoStudio always as it's the site's own studio)
        if (str.ok) {
          const studios = await str.json();
          const activeStudios = new Set(
            studios.filter((s: any) => s.isCollaboration).map((s: any) => s.name),
          );
          activeStudios.add("YumekoStudio"); // Always show site's own studio
          for (const studioName of Object.keys(merged)) {
            if (!activeStudios.has(studioName)) {
              delete merged[studioName];
            }
          }
        }
        
        setStudioMap(merged);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const studios = useMemo(
    () => Object.keys(studioMap).sort((a, b) => a.localeCompare(b)),
    [studioMap],
  );

  const filtered = useMemo(() => {
    return anime.filter((a) => {
      if (!matchesType(a, type)) return false;
      if (studio) {
        const ids = studioMap[studio];
        if (!ids?.includes(a.id)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !a.title.toLowerCase().includes(q) &&
          !a.altTitle?.toLowerCase().includes(q) &&
          !a.genres?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [anime, type, studio, search, studioMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, type, studio]);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => {
      if (totalPages <= 7) return true;
      if (p === 1 || p === totalPages) return true;
      return Math.abs(p - currentPage) <= 1;
    },
  );

  return (
    <>
      <Header />
      <main className={styles.page}>
        {/* ─── Hero ─── */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Каталог релизов</h1>
          <p className={styles.heroSub}>{anime.length} тайтлов на Yumeko</p>
        </div>

        {/* ─── Search ─── */}
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIco} />
            <input
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Название, жанр..."
            />
            {search && (
              <button
                className={styles.searchClear}
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <span className={styles.resultCount}>
            {filtered.length} из {anime.length}
          </span>
        </div>

        {/* ─── Category tabs ─── */}
        <div className={styles.tabs}>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              className={type === tab.key ? styles.tabActive : styles.tab}
              onClick={() => setType(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Studio chips ─── */}
        {studios.length > 0 && (
          <div className={styles.studioRow}>
            <span className={styles.studioLabel}>Озвучено:</span>
            <div className={styles.studioChips}>
              <button
                className={studio === "" ? styles.chipActive : styles.chip}
                onClick={() => setStudio("")}
              >
                Все
              </button>
              {studios.map((s) => (
                <button
                  key={s}
                  className={studio === s ? styles.chipActive : styles.chip}
                  onClick={() => setStudio(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Grid ─── */}
        {loading ? (
          <div className={styles.empty}>Загрузка каталога...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            {search || type !== "all" || studio
              ? "Ничего не найдено"
              : "Каталог пуст"}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {paged.map((a) => {
                const accent = getAccent(a.rating);
                return (
                  <Link
                    key={a.id}
                    href={`/realeses/anime-page/${a.id}`}
                    className={styles.card}
                  >
                    <div className={styles.poster}>
                      <img
                        src={a.poster}
                        alt={a.title}
                        className={styles.posterImg}
                      />
                      <span
                        className={styles.ratingBadge}
                        style={{ background: accent }}
                      >
                        {a.rating}
                      </span>
                      {a.format && (
                        <span className={styles.formatBadge}>{a.format}</span>
                      )}
                      <div className={styles.posterOverlay}>
                        <span className={styles.overlayTitle}>{a.title}</span>
                      </div>
                    </div>
                    <div className={styles.info}>
                      <p className={styles.cardTitle}>{a.title}</p>
                      <p className={styles.cardGenres}>{a.genres}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={16} />
                </button>

                {pageNums.map((p, i, arr) => {
                  const showDots = i > 0 && p - arr[i - 1] > 1;
                  return (
                    <span key={p} style={{ display: "contents" }}>
                      {showDots && <span className={styles.dots}>…</span>}
                      <button
                        className={
                          p === currentPage
                            ? styles.pageNumActive
                            : styles.pageNum
                        }
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}

                <button
                  className={styles.pageBtn}
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header/Header";
import { type AnimeDetails, getAccent } from "@/data/anime";
import { API_URL } from "@/config/hosts";
import styles from "./catalog.module.scss";

const PER_PAGE = 24;

export default function CatalogPage() {
  const [anime, setAnime] = useState<AnimeDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/anime`);
        if (res.ok) {
          const data: AnimeDetails[] = await res.json();
          setAnime(data);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return anime;
    const q = search.trim().toLowerCase();
    return anime.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.altTitle && a.altTitle.toLowerCase().includes(q)) ||
        (a.genres && a.genres.toLowerCase().includes(q))
    );
  }, [anime, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Каталог релизов</h1>
          <p className={styles.subtitle}>
            Все аниме на Yumeko — {anime.length} тайтлов
          </p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или жанру..."
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>
          <span className={styles.count}>
            {filtered.length} из {anime.length}
          </span>
        </div>

        {loading ? (
          <div className={styles.loadingState}>Загрузка каталога...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {search ? "Ничего не найдено" : "Каталог пуст"}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {paged.map((a) => (
                <Link
                  key={a.id}
                  href={`/realeses/anime-page/${a.id}`}
                  className={styles.card}
                >
                  <div className={styles.cardPoster}>
                    <img src={a.poster} alt={a.title} className={styles.cardImg} />
                    <span
                      className={styles.cardRating}
                      style={{ background: getAccent(a.rating) }}
                    >
                      {a.rating}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{a.title}</h3>
                    <span className={styles.cardMeta}>{a.genres}</span>
                  </div>
                </Link>
              ))}
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
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((p, i, arr) => {
                    const prev = arr[i - 1];
                    const showEllipsis = prev !== undefined && p - prev > 1;
                    return (
                      <span key={p}>
                        {showEllipsis && <span className={styles.pageEllipsis}>…</span>}
                        <button
                          className={`${styles.pageNum} ${p === currentPage ? styles.pageNumActive : ""}`}
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

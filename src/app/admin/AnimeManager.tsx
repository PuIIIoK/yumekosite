"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Image as ImageIcon, AlertTriangle, X, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { API_URL } from "@/config/hosts";
import type { AnimeDetails } from "@/data/anime";
import styles from "./admin.module.scss";

const PER_PAGE = 10;

export default function AnimeManager() {
  const router = useRouter();
  const [list, setList] = useState<AnimeDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnimeDetails | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [navigating, setNavigating] = useState(false);

  const handleAdd = () => {
    setNavigating(true);
    setTimeout(() => router.push("/admin/create-anime"), 500);
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/anime`);
      const data = await res.json();
      setList(data);
    } catch {
      setError("Не удалось загрузить список");
    }
    setLoading(false);
  };

  useEffect(() => { fetchList(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      (a.altTitle && a.altTitle.toLowerCase().includes(q)) ||
      String(a.id).includes(q)
    );
  }, [list, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/api/anime/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await fetchList();
    } catch {
      setError("Ошибка удаления");
    }
    setDeleting(false);
  };

  if (loading) {
    return <div className={styles.contentPlaceholder}><p>Загрузка...</p></div>;
  }

  return (
    <div className={`${styles.animeManager} ${navigating ? styles.animeManagerOut : ""}`}>
      <div className={styles.animeManagerHeader}>
        <h2 className={styles.animeManagerTitle}>Аниме каталог</h2>
        <button className={`${styles.animeAddBtn} ${navigating ? styles.animeAddBtnLoading : ""}`} onClick={handleAdd} disabled={navigating}>
          {navigating ? <><Loader2 size={16} className={styles.animeAddSpin} /> Создание...</> : <><Plus size={16} /> Добавить</>}
        </button>
      </div>

      <div className={styles.animeToolbar}>
        <div className={styles.animeSearchWrap}>
          <Search size={14} className={styles.animeSearchIcon} />
          <input
            className={styles.animeSearchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, альт. названию или ID..."
          />
          {search && (
            <button className={styles.animeSearchClear} onClick={() => setSearch("")}><X size={13} /></button>
          )}
        </div>
        <span className={styles.animeCount}>{filtered.length} из {list.length}</span>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.paginationBtn} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`${styles.paginationNum} ${p === currentPage ? styles.paginationNumActive : ""}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button className={styles.paginationBtn} disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {error && <div className={styles.animeError}>{error}</div>}

      <div className={styles.animeGrid}>
        {paged.map((anime) => (
          <div key={anime.id} className={styles.animeCard} onClick={() => router.push(`/admin/create-anime?id=${anime.id}`)}>
            <div className={styles.animeCardPoster}>
              {anime.poster ? (
                <img src={anime.poster} alt="" className={styles.animeCardPosterImg} />
              ) : (
                <div className={styles.animeCardPosterEmpty}><ImageIcon size={20} /></div>
              )}
              {anime.rating && <span className={styles.animeCardRating}>{anime.rating}</span>}
            </div>
            <div className={styles.animeCardBody}>
              <div className={styles.animeCardTop}>
                <span className={styles.animeCardId}>#{anime.id}</span>
                <h3 className={styles.animeCardTitle}>{anime.title}</h3>
                {anime.altTitle && <span className={styles.animeCardAlt}>{anime.altTitle}</span>}
              </div>
              <div className={styles.animeCardMeta}>
                {anime.format && <span className={styles.animeCardTag}>{anime.format}</span>}
                {anime.status && <span className={styles.animeCardTag}>{anime.status}</span>}
                {anime.season && anime.year && <span className={styles.animeCardTag}>{anime.season} {anime.year}</span>}
              </div>
              {anime.genres && <span className={styles.animeCardGenres}>{anime.genres}</span>}
            </div>
            <div className={styles.animeCardActions} onClick={(e) => e.stopPropagation()}>
              <button className={styles.animeEditBtn} onClick={() => router.push(`/admin/create-anime?id=${anime.id}`)} title="Редактировать">
                <Pencil size={14} />
              </button>
              <button className={styles.animeDeleteBtn} onClick={() => setDeleteTarget(anime)} title="Удалить">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className={styles.animeTableEmpty}>
          {search ? "Ничего не найдено" : "Нет аниме. Нажмите «Добавить» чтобы создать первое."}
        </div>
      )}
      {deleteTarget && (
        <div className={styles.deleteOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.deleteModalClose} onClick={() => setDeleteTarget(null)}><X size={16} /></button>
            <div className={styles.deleteModalIcon}>
              <AlertTriangle size={32} />
            </div>
            <h3 className={styles.deleteModalTitle}>Удалить аниме?</h3>
            <p className={styles.deleteModalText}>
              <strong>{deleteTarget.title}</strong> будет удалено без возможности восстановления.
            </p>
            <div className={styles.deleteModalActions}>
              <button className={styles.deleteModalCancel} onClick={() => setDeleteTarget(null)} disabled={deleting}>Отмена</button>
              <button className={styles.deleteModalConfirm} onClick={confirmDelete} disabled={deleting}>
                <Trash2 size={13} /> {deleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

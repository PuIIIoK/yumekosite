"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Search, X, Plus, Trash2, Loader2, Check, ChevronDown, Film, Play, AlertTriangle, Upload, Image, Maximize2 } from "lucide-react";
import Hls from "hls.js";
import { API_URL } from "@/config/hosts";
import type { AnimeDetails } from "@/data/anime";
import styles from "./admin.module.scss";

interface Episode {
  id: number;
  animeId: number;
  number: number;
  title: string | null;
  hlsUrl: string | null;
  previewUrl: string | null;
  duration: string | null;
  status: string;
  createdAt: string;
}

interface EpisodeForm {
  number: string;
  title: string;
}

const emptyForm: EpisodeForm = { number: "", title: "" };

function HlsModal({ episode, onClose }: { episode: Episode; onClose: () => void }) {
  const vRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = vRef.current;
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

  return (
    <div className={styles.deleteOverlay} onClick={onClose}>
      <div className={styles.epModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.epModalHeader}>
          <h3>{episode.title || `Эпизод ${episode.number}`}</h3>
          <div className={styles.epModalActions}>
            <button
              className={styles.epModalFullscreen}
              onClick={() => vRef.current?.requestFullscreen()}
              title="Полный экран"
            >
              <Maximize2 size={16} />
            </button>
            <button className={styles.epModalClose} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>
        <video ref={vRef} className={styles.epModalVideo} controls />
      </div>
    </div>
  );
}

export default function EpisodeManager() {
  const [animeList, setAnimeList] = useState<AnimeDetails[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [animeSearch, setAnimeSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [form, setForm] = useState<EpisodeForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Episode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [previewUploading, setPreviewUploading] = useState<number | null>(null);
  const [modalEp, setModalEp] = useState<Episode | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/anime`);
        const data = await res.json();
        setAnimeList(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const fetchEpisodes = useCallback(async (animeId: number) => {
    setEpisodesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/episodes/${animeId}`);
      if (res.ok) {
        setEpisodes(await res.json());
      }
    } catch {}
    setEpisodesLoading(false);
  }, []);

  // Poll for processing episodes
  useEffect(() => {
    if (!selectedAnime) return;
    const hasProcessing = episodes.some((e) => e.status === "processing");
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      fetchEpisodes(selectedAnime.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [episodes, selectedAnime, fetchEpisodes]);

  useEffect(() => {
    if (selectedAnime) {
      fetchEpisodes(selectedAnime.id);
      setForm({ ...emptyForm, number: String(episodes.length + 1) });
    }
  }, [selectedAnime]);

  useEffect(() => {
    if (selectedAnime) {
      setForm((f) => ({ ...f, number: String(episodes.length + 1) }));
    }
  }, [episodes, selectedAnime]);

  const filteredAnime = useMemo(() => {
    if (!animeSearch.trim()) return animeList;
    const q = animeSearch.trim().toLowerCase();
    return animeList.filter(
      (a) => a.title.toLowerCase().includes(q) || (a.altTitle && a.altTitle.toLowerCase().includes(q))
    );
  }, [animeList, animeSearch]);

  const filteredEpisodes = useMemo(() => {
    if (!search.trim()) return episodes;
    const q = search.trim().toLowerCase();
    return episodes.filter(
      (e) =>
        String(e.number).includes(q) ||
        (e.title && e.title.toLowerCase().includes(q))
    );
  }, [episodes, search]);

  const selectAnime = (anime: AnimeDetails) => {
    setSelectedAnime(anime);
    setDropdownOpen(false);
    setAnimeSearch("");
    setError(null);
    setSuccess(null);
  };

  const ACCEPTED_TYPES = ["video/mp4", "video/x-matroska", "video/quicktime", "video/webm"];
  const ACCEPTED_EXT = [".mp4", ".mkv", ".mov", ".webm"];

  const isVideoFile = (file: File) => {
    if (ACCEPTED_TYPES.includes(file.type)) return true;
    return ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
  };

  const uploadFile = async (file: File) => {
    if (!selectedAnime) return;
    if (!isVideoFile(file)) {
      setError("Поддерживаемые форматы: MP4, MKV, MOV, WebM");
      return;
    }
    const num = parseInt(form.number);
    if (!num || num < 1) {
      setError("Укажите номер эпизода");
      return;
    }
    setUploading(true);
    setUploadProgress("Загрузка видео...");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("animeId", String(selectedAnime.id));
      fd.append("number", String(num));
      if (form.title.trim()) fd.append("title", form.title.trim());

      const res = await fetch(`${API_URL}/api/episodes/upload`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        setUploadProgress("");
        setForm(emptyForm);
        await fetchEpisodes(selectedAnime.id);
        setSuccess(`Эпизод ${num} загружен, идёт конвертация`);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Ошибка загрузки");
        setUploadProgress("");
      }
    } catch {
      setError("Сетевая ошибка");
      setUploadProgress("");
    }
    setUploading(false);
  };

  const handleUploadEpisode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await uploadFile(file);
  };

  const handlePreviewUpload = async (epId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAnime) return;
    setPreviewUploading(epId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/episodes/${epId}/preview`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        await fetchEpisodes(selectedAnime.id);
        setSuccess("Превью загружено");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Ошибка загрузки превью");
      }
    } catch {
      setError("Ошибка загрузки");
    }
    setPreviewUploading(null);
    e.target.value = "";
  };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedAnime) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/episodes/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchEpisodes(selectedAnime.id);
        setSuccess(`Эпизод ${deleteTarget.number} удалён`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {}
    setDeleting(false);
    setDeleteTarget(null);
  };

  const statusLabel = (s: string) => {
    if (s === "processing") return "Конвертация...";
    if (s === "ready") return "Готов";
    if (s === "error") return "Ошибка";
    return s;
  };

  const statusColor = (s: string) => {
    if (s === "processing") return "#f59e0b";
    if (s === "ready") return "#10b981";
    if (s === "error") return "#ef4444";
    return "#888";
  };

  if (loading) {
    return <div className={styles.loader}>Загрузка...</div>;
  }

  return (
    <div className={styles.animeManager}>
      <div className={styles.animeManagerHeader}>
        <h2 className={styles.animeManagerTitle}>
          <Play size={22} style={{ marginRight: 8 }} />
          Эпизоды
        </h2>
      </div>

      {/* Anime selector */}
      <div className={styles.episodeSelector}>
        <label className={styles.episodeSelectorLabel}>Выберите аниме:</label>
        <div className={styles.episodeDropdownWrap}>
          <button
            className={styles.episodeDropdownBtn}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {selectedAnime ? (
              <span className={styles.episodeDropdownSelected}>
                <Film size={14} />
                {selectedAnime.title}
              </span>
            ) : (
              <span className={styles.episodeDropdownPlaceholder}>Нажмите для выбора...</span>
            )}
            <ChevronDown size={16} className={dropdownOpen ? styles.episodeChevronOpen : ""} />
          </button>
          {dropdownOpen && (
            <div className={styles.episodeDropdownList}>
              <div className={styles.episodeDropdownSearch}>
                <Search size={13} />
                <input
                  placeholder="Поиск аниме..."
                  value={animeSearch}
                  onChange={(e) => setAnimeSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.episodeDropdownItems}>
                {filteredAnime.length === 0 ? (
                  <div className={styles.episodeDropdownEmpty}>Ничего не найдено</div>
                ) : (
                  filteredAnime.map((a) => (
                    <button
                      key={a.id}
                      className={`${styles.episodeDropdownItem} ${selectedAnime?.id === a.id ? styles.episodeDropdownItemActive : ""}`}
                      onClick={() => selectAnime(a)}
                    >
                      {a.poster && (
                        <img src={a.poster} alt="" className={styles.episodeDropdownPoster} />
                      )}
                      <div className={styles.episodeDropdownInfo}>
                        <span className={styles.episodeDropdownTitle}>{a.title}</span>
                        {a.altTitle && (
                          <span className={styles.episodeDropdownAlt}>{a.altTitle}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedAnime && (
        <>
          {/* Upload episode form */}
          <div className={styles.episodeForm}>
            <h3 className={styles.episodeFormTitle}>Загрузить эпизод</h3>
            <div className={styles.episodeFormGrid} style={{ gridTemplateColumns: "100px 1fr" }}>
              <div className={styles.episodeFormField}>
                <label>Номер</label>
                <input
                  type="number"
                  min={1}
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div className={styles.episodeFormField}>
                <label>Название (опц.)</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Название эпизода"
                />
              </div>
            </div>

            {error && <div className={styles.episodeError}><AlertTriangle size={13} /> {error}</div>}
            {success && <div className={styles.episodeSuccess}><Check size={13} /> {success}</div>}

            {/* Drag & drop zone */}
            <div
              ref={dropRef}
              className={`${styles.epDropZone} ${dragOver ? styles.epDropZoneActive : ""} ${uploading ? styles.epDropZoneUploading : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (uploading) return;
                const num = parseInt(form.number);
                if (!num || num < 1) { setError("Укажите номер эпизода"); return; }
                setError(null);
                fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mkv,.mov,.webm,video/*"
                hidden
                onChange={handleUploadEpisode}
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <Loader2 size={28} className={styles.saveSpin} />
                  <span className={styles.epDropZoneText}>{uploadProgress || "Загрузка..."}</span>
                </>
              ) : (
                <>
                  <Upload size={28} />
                  <span className={styles.epDropZoneText}>Перетащите видео сюда или нажмите</span>
                  <span className={styles.epDropZoneHint}>MP4, MKV, MOV, WebM</span>
                </>
              )}
            </div>
          </div>

          {/* Episode list */}
          <div className={styles.episodeListSection}>
            <div className={styles.episodeListHeader}>
              <h3>Эпизоды ({episodes.length})</h3>
              {episodes.length > 3 && (
                <div className={styles.episodeSearchWrap}>
                  <Search size={13} />
                  <input
                    placeholder="Поиск..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && <X size={13} className={styles.episodeSearchClear} onClick={() => setSearch("")} />}
                </div>
              )}
            </div>

            {episodesLoading ? (
              <div className={styles.loader}>Загрузка эпизодов...</div>
            ) : filteredEpisodes.length === 0 ? (
              <div className={styles.episodeEmpty}>
                {episodes.length === 0 ? "Эпизодов пока нет. Загрузите первый!" : "Ничего не найдено"}
              </div>
            ) : (
              <div className={styles.episodeList}>
                {filteredEpisodes.map((ep) => (
                  <div key={ep.id} className={styles.episodeCard}>
                    {/* Preview thumbnail */}
                    <div className={styles.episodeThumb}>
                      {ep.previewUrl ? (
                        <img src={ep.previewUrl} alt="" className={styles.episodeThumbImg} />
                      ) : (
                        <div className={styles.episodeThumbPlaceholder}>
                          <Film size={16} />
                        </div>
                      )}
                    </div>
                    <div className={styles.episodeNumber}>{ep.number}</div>
                    <div className={styles.episodeInfo}>
                      <span className={styles.episodeCardTitle}>
                        {ep.title || `Эпизод ${ep.number}`}
                      </span>
                      {ep.status === "processing" ? (
                        <div className={styles.epProcessing}>
                          <div className={styles.epProcessingBar}>
                            <div className={styles.epProcessingFill} />
                          </div>
                          <span className={styles.epProcessingLabel}>Конвертация{ep.duration ? ` · ${ep.duration}` : "..."}</span>
                        </div>
                      ) : (
                        <span className={styles.episodeStatus} style={{ color: statusColor(ep.status) }}>
                          {statusLabel(ep.status)}
                          {ep.duration && <> · {ep.duration}</>}
                        </span>
                      )}
                    </div>

                    {/* Preview upload button */}
                    <label
                      className={styles.episodePreviewBtn}
                      title="Загрузить превью"
                    >
                      {previewUploading === ep.id ? (
                        <Loader2 size={14} className={styles.saveSpin} />
                      ) : (
                        <Image size={14} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handlePreviewUpload(ep.id, e)}
                        disabled={previewUploading === ep.id}
                      />
                    </label>

                    {/* Play in modal */}
                    {ep.status === "ready" && ep.hlsUrl && (
                      <button
                        className={styles.episodePlayLink}
                        onClick={() => setModalEp(ep)}
                        title="Воспроизвести"
                      >
                        <Play size={14} />
                      </button>
                    )}

                    <button
                      className={styles.episodeDeleteBtn}
                      onClick={() => setDeleteTarget(ep)}
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Video modal */}
      {modalEp && (
        <HlsModal episode={modalEp} onClose={() => setModalEp(null)} />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className={styles.deleteOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalIcon}><AlertTriangle size={28} /></div>
            <h3>Удалить эпизод {deleteTarget.number}?</h3>
            <p>Это действие нельзя отменить.</p>
            <div className={styles.deleteModalActions}>
              <button className={styles.deleteModalCancel} onClick={() => setDeleteTarget(null)} disabled={deleting}>Отмена</button>
              <button className={styles.deleteModalConfirm} onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className={styles.saveSpin} /> Удаление...</> : <><Trash2 size={14} /> Удалить</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  X,
  Plus,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
  Film,
  Play,
  AlertTriangle,
  Upload,
  Image,
  Maximize2,
  Users,
  Mic,
  Pencil,
} from "lucide-react";
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
  studio: string;
  status: string;
  progress: number;
  createdAt: string;
}

interface EpisodeForm {
  number: string;
  title: string;
  studio: string;
}

interface VoiceCast {
  id: number;
  animeId: number;
  studio: string;
  actorName: string;
  actorUsername?: string;
  actorDisplayName?: string;
  actorHasAvatar?: boolean;
  actorRoleColor?: string;
  characterName: string;
}

const DEFAULT_STUDIOS = ["YumekoStudio"];
const STUDIOS_KEY = "yumeko_studios";
const emptyForm: EpisodeForm = {
  number: "",
  title: "",
  studio: "YumekoStudio",
};

function HlsModal({
  episode,
  onClose,
}: {
  episode: Episode;
  onClose: () => void;
}) {
  const vRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = vRef.current;
    if (!video || !episode.hlsUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        startLevel: 0, // начинать с минимального качества — мгновенный старт
        maxBufferLength: 15, // меньший буфер для быстрого старта в превью
        maxMaxBufferLength: 30,
      });
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
  const { user } = useAuth();
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
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing">(
    "uploading",
  );
  const [previewUploading, setPreviewUploading] = useState<number | null>(null);
  const [modalEp, setModalEp] = useState<Episode | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filterStudio, setFilterStudio] = useState<string | null>(null);
  const [voiceCast, setVoiceCast] = useState<VoiceCast[]>([]);
  const [vcStudio, setVcStudio] = useState<string | null>(null);
  const [vcActor, setVcActor] = useState("");
  const [vcUsername, setVcUsername] = useState("");
  const [vcCharacter, setVcCharacter] = useState("");
  const [vcSaving, setVcSaving] = useState(false);
  const [editingVcId, setEditingVcId] = useState<number | null>(null);
  const [editVcActor, setEditVcActor] = useState("");
  const [editVcUsername, setEditVcUsername] = useState("");
  const [editVcCharacter, setEditVcCharacter] = useState("");
  const [editVcSaving, setEditVcSaving] = useState(false);
  const [studios, setStudios] = useState<string[]>(DEFAULT_STUDIOS);
  const [addingStudio, setAddingStudio] = useState(false);
  const [studioDropdownOpen, setStudioDropdownOpen] = useState(false);
  const [newStudioName, setNewStudioName] = useState("");
  const [editStudioEpId, setEditStudioEpId] = useState<number | null>(null);
  const [editStudioSaving, setEditStudioSaving] = useState(false);
  const newStudioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STUDIOS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const merged = [...new Set([...DEFAULT_STUDIOS, ...parsed])];
        setStudios(merged);
      }
    } catch {}
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/anime`);
        const data = await res.json();
        setAnimeList(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const fetchEpisodes = useCallback(async (animeId: number, silent = false) => {
    if (!silent) setEpisodesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/episodes/${animeId}`);
      if (res.ok) {
        setEpisodes(await res.json());
      }
    } catch {}
    if (!silent) setEpisodesLoading(false);
  }, []);

  const fetchVoiceCast = useCallback(async (animeId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/voice-cast/${animeId}`);
      if (res.ok) setVoiceCast(await res.json());
    } catch {}
  }, []);

  const addVoiceCast = async () => {
    if (!selectedAnime || !vcStudio || !vcActor.trim() || !vcCharacter.trim())
      return;
    setVcSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/voice-cast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animeId: selectedAnime.id,
          studio: vcStudio,
          actorName: vcActor.trim(),
          actorUsername: vcUsername.trim() || null,
          characterName: vcCharacter.trim(),
        }),
      });
      if (res.ok) {
        setVcActor("");
        setVcUsername("");
        setVcCharacter("");
        await fetchVoiceCast(selectedAnime.id);
      }
    } catch {}
    setVcSaving(false);
  };

  const deleteVoiceCast = async (id: number) => {
    if (!selectedAnime) return;
    try {
      await fetch(`${API_URL}/api/voice-cast/${id}`, { method: "DELETE" });
      await fetchVoiceCast(selectedAnime.id);
    } catch {}
  };

  const startEditVc = (vc: VoiceCast) => {
    setEditingVcId(vc.id);
    setEditVcActor(vc.actorName);
    setEditVcUsername(vc.actorUsername ?? "");
    setEditVcCharacter(vc.characterName);
  };

  const cancelEditVc = () => {
    setEditingVcId(null);
    setEditVcActor("");
    setEditVcUsername("");
    setEditVcCharacter("");
  };

  const updateVoiceCast = async () => {
    if (!selectedAnime || editingVcId === null) return;
    if (!editVcActor.trim() || !editVcCharacter.trim()) return;
    setEditVcSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/voice-cast/${editingVcId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorName: editVcActor.trim(),
          actorUsername: editVcUsername.trim() || null,
          characterName: editVcCharacter.trim(),
        }),
      });
      if (res.ok) {
        cancelEditVc();
        await fetchVoiceCast(selectedAnime.id);
      }
    } catch {}
    setEditVcSaving(false);
  };

  // Poll for in-progress episodes (silent — no loading flash)
  useEffect(() => {
    if (!selectedAnime) return;
    const hasActive = episodes.some((e) =>
      ["processing", "converting", "uploading", "finalizing"].includes(
        e.status,
      ),
    );
    if (!hasActive) return;
    const interval = setInterval(() => {
      fetchEpisodes(selectedAnime.id, true);
    }, 2000);
    return () => clearInterval(interval);
  }, [episodes, selectedAnime, fetchEpisodes]);

  useEffect(() => {
    if (selectedAnime) {
      fetchEpisodes(selectedAnime.id);
      fetchVoiceCast(selectedAnime.id);
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
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.altTitle && a.altTitle.toLowerCase().includes(q)),
    );
  }, [animeList, animeSearch]);

  const episodeStudios = useMemo(() => {
    return [...new Set(episodes.map((e) => e.studio || "YumekoStudio"))].sort();
  }, [episodes]);

  useEffect(() => {
    if (episodeStudios.length > 0 && !vcStudio) setVcStudio(episodeStudios[0]);
  }, [episodeStudios]);

  const vcByStudio = useMemo(() => {
    const active = vcStudio || episodeStudios[0] || "YumekoStudio";
    return voiceCast.filter((vc) => vc.studio === active);
  }, [voiceCast, vcStudio, episodeStudios]);

  const filteredEpisodes = useMemo(() => {
    let list = episodes;
    if (filterStudio) {
      list = list.filter((e) => (e.studio || "YumekoStudio") === filterStudio);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          String(e.number).includes(q) ||
          (e.title && e.title.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [episodes, search, filterStudio]);

  const selectAnime = (anime: AnimeDetails) => {
    setSelectedAnime(anime);
    setDropdownOpen(false);
    setAnimeSearch("");
    setError(null);
    setSuccess(null);
  };

  const ACCEPTED_TYPES = [
    "video/mp4",
    "video/x-matroska",
    "video/quicktime",
    "video/webm",
  ];
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
    setUploadPercent(0);
    setUploadPhase("uploading");
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("animeId", String(selectedAnime.id));
    fd.append("number", String(num));
    if (form.title.trim()) fd.append("title", form.title.trim());
    fd.append("studio", form.studio);
    // grantXpUserId — для начисления XP залившему
    if (user?.id) fd.append("grantXpUserId", String(user.id));

    const animeId = selectedAnime.id;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/episodes/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadPercent(Math.round((e.loaded / e.total) * 100));
      }
    };

    // Файл 100% отправлен — показываем фазу обработки на сервере
    xhr.upload.onloadend = () => {
      setUploadPercent(100);
      setUploadPhase("processing");
    };

    xhr.onload = async () => {
      setUploading(false);
      setUploadPercent(0);
      setUploadPhase("uploading");
      if (xhr.status >= 200 && xhr.status < 300) {
        setForm(emptyForm);
        setSuccess(`Эпизод ${num} загружен, идёт конвертация`);
        setTimeout(() => setSuccess(null), 4000);
        await fetchEpisodes(animeId);
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.error || "Ошибка загрузки");
        } catch {
          setError("Ошибка загрузки");
        }
      }
    };

    xhr.onerror = () => {
      setError("Сетевая ошибка");
      setUploading(false);
      setUploadPercent(0);
      setUploadPhase("uploading");
    };

    xhr.send(fd);
  };

  const handleUploadEpisode = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

  const handlePreviewUpload = async (
    epId: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

  const handleChangeStudio = async (epId: number, newStudio: string) => {
    if (!selectedAnime) return;
    setEditStudioSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/episodes/${epId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studio: newStudio }),
      });
      if (res.ok) {
        await fetchEpisodes(selectedAnime.id, true);
        setSuccess(`Студия изменена на ${newStudio}`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError("Ошибка смены студии");
      }
    } catch {
      setError("Ошибка сети");
    }
    setEditStudioSaving(false);
    setEditStudioEpId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedAnime) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/episodes/${deleteTarget.id}`, {
        method: "DELETE",
      });
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
    if (s === "processing") return "Подготовка...";
    if (s === "converting") return "Конвертация";
    if (s === "uploading") return "Загрузка на сервер";
    if (s === "finalizing") return "Финализация...";
    if (s === "ready") return "Готов";
    if (s === "error") return "Ошибка";
    return s;
  };

  const statusColor = (s: string) => {
    if (s === "processing" || s === "converting") return "#f59e0b";
    if (s === "uploading") return "#3b82f6";
    if (s === "finalizing") return "#8b5cf6";
    if (s === "ready") return "#10b981";
    if (s === "error") return "#ef4444";
    return "#888";
  };

  const isActiveStatus = (s: string) =>
    ["processing", "converting", "uploading", "finalizing"].includes(s);

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
              <span className={styles.episodeDropdownPlaceholder}>
                Нажмите для выбора...
              </span>
            )}
            <ChevronDown
              size={16}
              className={dropdownOpen ? styles.episodeChevronOpen : ""}
            />
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
                  <div className={styles.episodeDropdownEmpty}>
                    Ничего не найдено
                  </div>
                ) : (
                  filteredAnime.map((a) => (
                    <button
                      key={a.id}
                      className={`${styles.episodeDropdownItem} ${selectedAnime?.id === a.id ? styles.episodeDropdownItemActive : ""}`}
                      onClick={() => selectAnime(a)}
                    >
                      {a.poster && (
                        <img
                          src={a.poster}
                          alt=""
                          className={styles.episodeDropdownPoster}
                        />
                      )}
                      <div className={styles.episodeDropdownInfo}>
                        <span className={styles.episodeDropdownTitle}>
                          {a.title}
                        </span>
                        {a.altTitle && (
                          <span className={styles.episodeDropdownAlt}>
                            {a.altTitle}
                          </span>
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
            <div
              className={styles.episodeFormGrid}
              style={{ gridTemplateColumns: "80px 1fr 260px" }}
            >
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
              <div className={styles.episodeFormField}>
                <label>Студия</label>
                {addingStudio ? (
                  <div className={styles.epStudioRow}>
                    <input
                      ref={newStudioRef}
                      value={newStudioName}
                      onChange={(e) => setNewStudioName(e.target.value)}
                      placeholder="Название студии"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newStudioName.trim()) {
                          const trimmed = newStudioName.trim();
                          if (!studios.includes(trimmed)) {
                            const updated = [...studios, trimmed];
                            setStudios(updated);
                            localStorage.setItem(
                              STUDIOS_KEY,
                              JSON.stringify(updated),
                            );
                          }
                          setForm({ ...form, studio: trimmed });
                          setNewStudioName("");
                          setAddingStudio(false);
                        }
                        if (e.key === "Escape") {
                          setNewStudioName("");
                          setAddingStudio(false);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.epStudioAddBtn}
                      onClick={() => {
                        if (newStudioName.trim()) {
                          const trimmed = newStudioName.trim();
                          if (!studios.includes(trimmed)) {
                            const updated = [...studios, trimmed];
                            setStudios(updated);
                            localStorage.setItem(
                              STUDIOS_KEY,
                              JSON.stringify(updated),
                            );
                          }
                          setForm({ ...form, studio: trimmed });
                        }
                        setNewStudioName("");
                        setAddingStudio(false);
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.epStudioAddBtn}
                      onClick={() => {
                        setNewStudioName("");
                        setAddingStudio(false);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.epStudioRow}>
                    <div className={styles.epStudioDropdown}>
                      <button
                        type="button"
                        className={styles.epStudioDropdownTrigger}
                        onClick={() =>
                          setStudioDropdownOpen(!studioDropdownOpen)
                        }
                      >
                        <span>{form.studio}</span>
                        <ChevronDown size={14} />
                      </button>
                      {studioDropdownOpen && (
                        <div className={styles.epStudioDropdownMenu}>
                          {studios.map((s) => (
                            <div
                              key={s}
                              className={`${styles.epStudioDropdownItem} ${form.studio === s ? styles.epStudioDropdownItemActive : ""}`}
                            >
                              <button
                                type="button"
                                className={styles.epStudioDropdownSelect}
                                onClick={() => {
                                  setForm({ ...form, studio: s });
                                  setStudioDropdownOpen(false);
                                }}
                              >
                                {s}
                              </button>
                              {!DEFAULT_STUDIOS.includes(s) && (
                                <button
                                  type="button"
                                  className={styles.epStudioDropdownDelete}
                                  title={`Удалить ${s}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updated = studios.filter(
                                      (st) => st !== s,
                                    );
                                    setStudios(updated);
                                    localStorage.setItem(
                                      STUDIOS_KEY,
                                      JSON.stringify(updated),
                                    );
                                    if (form.studio === s) {
                                      setForm({
                                        ...form,
                                        studio: updated[0] || "YumekoStudio",
                                      });
                                    }
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.epStudioAddBtn}
                      title="Добавить студию"
                      onClick={() => setAddingStudio(true)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className={styles.episodeError}>
                <AlertTriangle size={13} /> {error}
              </div>
            )}
            {success && (
              <div className={styles.episodeSuccess}>
                <Check size={13} /> {success}
              </div>
            )}

            {/* Drag & drop zone */}
            <div
              ref={dropRef}
              className={`${styles.epDropZone} ${dragOver ? styles.epDropZoneActive : ""} ${uploading ? styles.epDropZoneUploading : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (uploading) return;
                const num = parseInt(form.number);
                if (!num || num < 1) {
                  setError("Укажите номер эпизода");
                  return;
                }
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
                  <div className={styles.epUploadProgress}>
                    <div className={styles.epUploadProgressBar}>
                      <div
                        className={styles.epUploadProgressFill}
                        style={{ width: `${uploadPercent}%` }}
                      />
                    </div>
                    <span className={styles.epUploadPercent}>
                      {uploadPercent}%
                    </span>
                  </div>
                  <span className={styles.epDropZoneText}>
                    {uploadPhase === "processing"
                      ? "Обработка на сервере..."
                      : "Загрузка видео..."}
                  </span>
                </>
              ) : (
                <>
                  <Upload size={28} />
                  <span className={styles.epDropZoneText}>
                    Перетащите видео сюда или нажмите
                  </span>
                  <span className={styles.epDropZoneHint}>
                    MP4, MKV, MOV, WebM
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Episode list */}
          <div className={styles.episodeListSection}>
            <div className={styles.episodeListHeader}>
              <h3>
                Эпизоды (
                {filterStudio ? filteredEpisodes.length : episodes.length})
              </h3>
              {episodes.length > 3 && (
                <div className={styles.episodeSearchWrap}>
                  <Search size={13} />
                  <input
                    placeholder="Поиск..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <X
                      size={13}
                      className={styles.episodeSearchClear}
                      onClick={() => setSearch("")}
                    />
                  )}
                </div>
              )}
            </div>
            {episodeStudios.length > 1 && (
              <div className={styles.epStudioFilter}>
                <button
                  className={`${styles.epStudioFilterBtn} ${!filterStudio ? styles.epStudioFilterBtnActive : ""}`}
                  onClick={() => setFilterStudio(null)}
                >
                  Все
                </button>
                {episodeStudios.map((s) => (
                  <button
                    key={s}
                    className={`${styles.epStudioFilterBtn} ${filterStudio === s ? styles.epStudioFilterBtnActive : ""}`}
                    onClick={() => setFilterStudio(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {episodesLoading ? (
              <div className={styles.loader}>Загрузка эпизодов...</div>
            ) : filteredEpisodes.length === 0 ? (
              <div className={styles.episodeEmpty}>
                {episodes.length === 0
                  ? "Эпизодов пока нет. Загрузите первый!"
                  : "Ничего не найдено"}
              </div>
            ) : (
              <div className={styles.episodeList}>
                {filteredEpisodes.map((ep) => (
                  <div key={ep.id} className={styles.episodeCard}>
                    {/* Preview thumbnail */}
                    <div className={styles.episodeThumb}>
                      {ep.previewUrl ? (
                        <img
                          src={ep.previewUrl}
                          alt=""
                          className={styles.episodeThumbImg}
                        />
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
                        <span
                          className={styles.epStudioBadge}
                          style={{ cursor: "pointer", position: "relative" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditStudioEpId(editStudioEpId === ep.id ? null : ep.id);
                          }}
                          title="Нажмите чтобы сменить студию"
                        >
                          {ep.studio}
                          <ChevronDown size={10} style={{ marginLeft: 2, verticalAlign: -1 }} />
                          {editStudioEpId === ep.id && (
                            <span
                              className={styles.epStudioDropdownMenu}
                              style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 60, minWidth: 160 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {studios.map((s) => (
                                <div
                                  key={s}
                                  className={`${styles.epStudioDropdownItem} ${ep.studio === s ? styles.epStudioDropdownItemActive : ""}`}
                                >
                                  <button
                                    type="button"
                                    className={styles.epStudioDropdownSelect}
                                    disabled={editStudioSaving}
                                    onClick={() => {
                                      if (s !== ep.studio) handleChangeStudio(ep.id, s);
                                      else setEditStudioEpId(null);
                                    }}
                                  >
                                    {s}
                                    {ep.studio === s && <Check size={12} style={{ marginLeft: 4, opacity: 0.6 }} />}
                                  </button>
                                </div>
                              ))}
                            </span>
                          )}
                        </span>
                      </span>
                      {isActiveStatus(ep.status) ? (
                        <div className={styles.epProcessing}>
                          <div className={styles.epProcessingBar}>
                            <div
                              className={styles.epProcessingFill}
                              style={{
                                width:
                                  ep.status === "finalizing"
                                    ? "100%"
                                    : `${ep.progress}%`,
                                background: statusColor(ep.status),
                                animation:
                                  ep.status === "finalizing"
                                    ? "none"
                                    : undefined,
                              }}
                            />
                          </div>
                          <span
                            className={styles.epProcessingLabel}
                            style={{ color: statusColor(ep.status) }}
                          >
                            {statusLabel(ep.status)}
                            {(ep.status === "converting" ||
                              ep.status === "uploading") &&
                              ` ${ep.progress}%`}
                            {ep.duration && ` · ${ep.duration}`}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={styles.episodeStatus}
                          style={{ color: statusColor(ep.status) }}
                        >
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

          {/* ── Voice Cast / Работа над релизом ── */}
          <div className={styles.episodeListSection}>
            <div className={styles.episodeListHeader}>
              <h3>
                <Mic size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                Работа над релизом
              </h3>
            </div>

            {episodeStudios.length > 1 && (
              <div className={styles.epStudioFilter}>
                {episodeStudios.map((s) => (
                  <button
                    key={s}
                    className={`${styles.epStudioFilterBtn} ${vcStudio === s ? styles.epStudioFilterBtnActive : ""}`}
                    onClick={() => setVcStudio(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div
              className={styles.episodeFormGrid}
              style={{
                gridTemplateColumns: "1fr 1fr 1fr auto",
                marginBottom: 12,
              }}
            >
              <div className={styles.episodeFormField}>
                <label>Профиль (@username)</label>
                <input
                  value={vcUsername}
                  onChange={(e) =>
                    setVcUsername(e.target.value.replace("@", ""))
                  }
                  placeholder="username"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addVoiceCast();
                  }}
                />
              </div>
              <div className={styles.episodeFormField}>
                <label>Имя актёра</label>
                <input
                  value={vcActor}
                  onChange={(e) => setVcActor(e.target.value)}
                  placeholder="Hirst"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addVoiceCast();
                  }}
                />
              </div>
              <div className={styles.episodeFormField}>
                <label>Персонаж</label>
                <input
                  value={vcCharacter}
                  onChange={(e) => setVcCharacter(e.target.value)}
                  placeholder="Ко Ямори"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addVoiceCast();
                  }}
                />
              </div>
              <div
                className={styles.episodeFormField}
                style={{ display: "flex", alignItems: "flex-end" }}
              >
                <button
                  className={styles.epStudioAddBtn}
                  onClick={addVoiceCast}
                  disabled={vcSaving || !vcActor.trim() || !vcCharacter.trim()}
                  title="Добавить"
                  style={{ height: 36, width: 36 }}
                >
                  {vcSaving ? (
                    <Loader2 size={14} className={styles.saveSpin} />
                  ) : (
                    <Plus size={16} />
                  )}
                </button>
              </div>
            </div>

            {vcByStudio.length === 0 ? (
              <div className={styles.episodeEmpty}>
                Актёров озвучки пока нет
              </div>
            ) : (
              <div className={styles.episodeList}>
                {vcByStudio.map((vc) => (
                  <div key={vc.id} className={styles.episodeCard}>
                    <div className={styles.episodeNumber} style={{ width: 32 }}>
                      {vc.actorUsername && vc.actorHasAvatar ? (
                        <img
                          src={`${API_URL}/api/media/${vc.actorUsername}/avatar`}
                          alt=""
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            objectFit: "cover",
                            border: vc.actorRoleColor
                              ? `2px solid ${vc.actorRoleColor}`
                              : "2px solid rgba(255,255,255,0.1)",
                          }}
                        />
                      ) : (
                        <Users size={14} />
                      )}
                    </div>

                    {editingVcId === vc.id ? (
                      <>
                        <div
                          className={styles.episodeInfo}
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <input
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: "4px 8px",
                              fontSize: 12,
                              background:
                                "var(--bg-input, rgba(255,255,255,0.06))",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              color: "var(--text-primary)",
                              outline: "none",
                            }}
                            value={editVcActor}
                            onChange={(e) => setEditVcActor(e.target.value)}
                            placeholder="Имя актёра"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateVoiceCast();
                              if (e.key === "Escape") cancelEditVc();
                            }}
                            autoFocus
                          />
                          <input
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: "4px 8px",
                              fontSize: 12,
                              background:
                                "var(--bg-input, rgba(255,255,255,0.06))",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              color: "var(--text-primary)",
                              outline: "none",
                            }}
                            value={editVcUsername}
                            onChange={(e) =>
                              setEditVcUsername(e.target.value.replace("@", ""))
                            }
                            placeholder="@username"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateVoiceCast();
                              if (e.key === "Escape") cancelEditVc();
                            }}
                          />
                          <input
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: "4px 8px",
                              fontSize: 12,
                              background:
                                "var(--bg-input, rgba(255,255,255,0.06))",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              color: "var(--text-primary)",
                              outline: "none",
                            }}
                            value={editVcCharacter}
                            onChange={(e) => setEditVcCharacter(e.target.value)}
                            placeholder="Персонаж"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateVoiceCast();
                              if (e.key === "Escape") cancelEditVc();
                            }}
                          />
                        </div>
                        <button
                          className={styles.episodeDeleteBtn}
                          style={{ color: "#22c55e" }}
                          onClick={updateVoiceCast}
                          disabled={
                            editVcSaving ||
                            !editVcActor.trim() ||
                            !editVcCharacter.trim()
                          }
                          title="Сохранить"
                        >
                          {editVcSaving ? (
                            <Loader2 size={14} className={styles.saveSpin} />
                          ) : (
                            <Check size={14} />
                          )}
                        </button>
                        <button
                          className={styles.episodeDeleteBtn}
                          onClick={cancelEditVc}
                          title="Отмена"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={styles.episodeInfo}>
                          <span className={styles.episodeCardTitle}>
                            <span
                              style={
                                vc.actorRoleColor
                                  ? { color: vc.actorRoleColor }
                                  : undefined
                              }
                            >
                              {vc.actorDisplayName || vc.actorName}
                            </span>
                            {vc.actorUsername && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-muted)",
                                  marginLeft: 4,
                                }}
                              >
                                @{vc.actorUsername}
                              </span>
                            )}
                            <span className={styles.epStudioBadge}>
                              {vc.studio}
                            </span>
                          </span>
                          <span
                            className={styles.episodeStatus}
                            style={{ color: "var(--text-muted)" }}
                          >
                            → {vc.characterName}
                          </span>
                        </div>
                        <button
                          className={styles.episodeDeleteBtn}
                          style={{ color: "var(--accent)" }}
                          onClick={() => startEditVc(vc)}
                          title="Редактировать"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className={styles.episodeDeleteBtn}
                          onClick={() => deleteVoiceCast(vc.id)}
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
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
        <div
          className={styles.deleteOverlay}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className={styles.deleteModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.deleteModalIcon}>
              <AlertTriangle size={28} />
            </div>
            <h3>Удалить эпизод {deleteTarget.number}?</h3>
            <p>Это действие нельзя отменить.</p>
            <div className={styles.deleteModalActions}>
              <button
                className={styles.deleteModalCancel}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className={styles.deleteModalConfirm}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className={styles.saveSpin} />{" "}
                    Удаление...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Удалить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
  Settings,
  SkipBack,
  SkipForward,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Clock,
  Camera,
} from "lucide-react";
import Hls from "hls.js";
import { API_URL, CONV_URL } from "@/config/hosts";
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
  introStart: number | null;
  introEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
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

const emptyForm: EpisodeForm = {
  number: "",
  title: "",
  studio: "",
};

function formatTime(t: number | null | undefined): string {
  if (t == null || !isFinite(t) || t < 0) return "--:--";
  const total = Math.floor(t);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Append a cache-busting query param so the browser always re-fetches a
// freshly uploaded cover instead of serving a stale copy under the same URL.
function bustCache(url: string): string {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${Date.now()}`;
}

function parseTime(str: string): number | null {
  const s = str.trim();
  if (!s) return null;
  // support "mm:ss", "h:mm:ss", or raw seconds
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => parseInt(p, 10));
    if (parts.some((p) => isNaN(p) || p < 0)) return null;
    let total = 0;
    for (const p of parts) total = total * 60 + p;
    return total;
  }
  const n = Number(s);
  return isNaN(n) || n < 0 ? null : n;
}

function EpisodeSettingsModal({
  episode,
  onClose,
  onSaved,
  onPreviewUploaded,
  apiUrl,
  username,
}: {
  episode: Episode;
  onClose: () => void;
  onSaved: (updated: Partial<Episode>) => void;
  onPreviewUploaded: (previewUrl: string) => void;
  apiUrl: string;
  username: string | undefined;
}) {
  const vRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);

  const [title, setTitle] = useState<string>(episode.title || "");

  const [introStart, setIntroStart] = useState<string>(
    episode.introStart != null ? formatTime(episode.introStart) : "",
  );
  const [introEnd, setIntroEnd] = useState<string>(
    episode.introEnd != null ? formatTime(episode.introEnd) : "",
  );
  const [outroStart, setOutroStart] = useState<string>(
    episode.outroStart != null ? formatTime(episode.outroStart) : "",
  );
  const [outroEnd, setOutroEnd] = useState<string>(
    episode.outroEnd != null ? formatTime(episode.outroEnd) : "",
  );

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [previewUrl, setPreviewUrl] = useState(episode.previewUrl || "");
  const [previewUploading, setPreviewUploading] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  // Screenshot captured from the player, staged locally until "Сохранить".
  const [pendingCover, setPendingCover] = useState<Blob | null>(null);
  const pendingCoverUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const video = vRef.current;
    if (!video || !episode.hlsUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1,
        maxBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(episode.hlsUrl);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = episode.hlsUrl;
    }
  }, [episode.hlsUrl]);

  useEffect(() => {
    const video = vRef.current;
    if (!video) return;
    const onTime = () => {
      setCurrent(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onLoaded = () => setDuration(video.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("durationchange", onLoaded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("progress", onTime);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("durationchange", onLoaded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("progress", onTime);
    };
  }, []);

  const togglePlay = () => {
    const v = vRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const seekBy = (delta: number) => {
    const v = vRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  };

  const seekTo = (t: number) => {
    const v = vRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, t));
  };

  const useCurrentFor = (setter: (s: string) => void) => {
    const v = vRef.current;
    if (!v) return;
    setter(formatTime(v.currentTime));
  };

  const jumpTo = (str: string) => {
    const t = parseTime(str);
    if (t != null) seekTo(t);
  };

  // Capture the current video frame into a Blob, stage it as the pending
  // cover and preview it locally. The blob is uploaded only on "Сохранить".
  const captureFrame = () => {
    const v = vRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) {
      setPreviewErr("Кадр ещё не готов");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    } catch {
      setPreviewErr("Не удалось сделать кадр (CORS)");
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setPreviewErr("Не удалось сделать кадр");
          return;
        }
        if (pendingCoverUrlRef.current) {
          URL.revokeObjectURL(pendingCoverUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        pendingCoverUrlRef.current = url;
        setPendingCover(blob);
        setPreviewUrl(url);
        setPreviewErr(null);
      },
      "image/jpeg",
      0.92,
    );
  };

  // Clean up the staged screenshot object URL on unmount.
  useEffect(() => {
    return () => {
      if (pendingCoverUrlRef.current) {
        URL.revokeObjectURL(pendingCoverUrlRef.current);
      }
    };
  }, []);

  // Upload the staged screenshot as the episode cover. Returns true on success.
  const uploadPendingCover = async (): Promise<boolean> => {
    if (!pendingCover) return true;
    const fd = new FormData();
    fd.append("file", pendingCover, `episode-${episode.id}-cover.jpg`);
    const coverRes = await fetch(
      `${apiUrl}/api/episodes/${episode.id}/preview`,
      { method: "POST", body: fd },
    );
    if (!coverRes.ok) {
      const data = await coverRes.json().catch(() => ({}));
      setSaveErr(data.error || "Ошибка загрузки обложки");
      return false;
    }
    const data = await coverRes.json().catch(() => null);
    const rawUrl = data?.previewUrl || "";
    if (rawUrl) {
      // Cache-bust so the browser reloads the new frame instead of the
      // previously cached image served under the same URL.
      const url = bustCache(rawUrl);
      if (pendingCoverUrlRef.current) {
        URL.revokeObjectURL(pendingCoverUrlRef.current);
        pendingCoverUrlRef.current = null;
      }
      setPreviewUrl(url);
      onPreviewUploaded(url);
    }
    setPendingCover(null);
    return true;
  };

  // Persist the episode title (uses the generic episode PUT endpoint).
  // Returns true on success.
  const saveTitleOnly = async (): Promise<boolean> => {
    const newTitle = title.trim();
    if (newTitle === (episode.title || "")) return true; // nothing changed
    const res = await fetch(`${apiUrl}/api/episodes/${episode.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, title: newTitle }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveErr(data.error || "Ошибка сохранения названия");
      return false;
    }
    onSaved({ title: newTitle || null });
    return true;
  };

  // Persist OP/ED markers. Returns true on success.
  const saveMarkersOnly = async (): Promise<boolean> => {
    const payload = {
      username,
      introStart: parseTime(introStart),
      introEnd: parseTime(introEnd),
      outroStart: parseTime(outroStart),
      outroEnd: parseTime(outroEnd),
    };
    const res = await fetch(`${apiUrl}/api/episodes/${episode.id}/markers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveErr(data.error || "Ошибка сохранения");
      return false;
    }
    onSaved({
      introStart: payload.introStart,
      introEnd: payload.introEnd,
      outroStart: payload.outroStart,
      outroEnd: payload.outroEnd,
    });
    return true;
  };

  // Unified save handler: what happens depends on `mode`.
  //  - "cover"   → upload only the captured screenshot
  //  - "markers" → save only OP/ED markers
  //  - "all"     → upload the screenshot (if any) and save markers
  const handleSave = async (mode: "cover" | "title" | "markers" | "all") => {
    if (!username) {
      setSaveErr("Требуется авторизация");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    setSaveOk(false);
    try {
      if (mode === "cover") {
        const ok = await uploadPendingCover();
        if (ok) {
          setSaveOk(true);
          setTimeout(() => setSaveOk(false), 2000);
        }
      } else if (mode === "title") {
        const ok = await saveTitleOnly();
        if (ok) {
          setSaveOk(true);
          setTimeout(() => setSaveOk(false), 2000);
        }
      } else if (mode === "markers") {
        const titleOk = await saveTitleOnly();
        const ok = titleOk && (await saveMarkersOnly());
        if (ok) {
          setSaveOk(true);
          setTimeout(() => setSaveOk(false), 2000);
        }
      } else {
        const coverOk = await uploadPendingCover();
        if (coverOk) {
          const titleOk = await saveTitleOnly();
          const markersOk = titleOk && (await saveMarkersOnly());
          if (markersOk) {
            setSaveOk(true);
            setTimeout(() => setSaveOk(false), 2000);
          }
        }
      }
    } catch {
      setSaveErr("Ошибка сети");
    }
    setSaving(false);
  };


  const handlePreviewUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUploading(true);
    setPreviewErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiUrl}/api/episodes/${episode.id}/preview`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const rawUrl = data?.previewUrl || "";
        if (rawUrl) {
          // Cache-bust so the browser shows the just-uploaded image.
          const url = bustCache(rawUrl);
          setPreviewUrl(url);
          onPreviewUploaded(url);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setPreviewErr(data.error || "Ошибка загрузки");
      }
    } catch {
      setPreviewErr("Ошибка сети");
    }
    setPreviewUploading(false);
    e.target.value = "";
  };

  const progressPct = duration > 0 ? (current / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  const markerPct = (t: number | null) =>
    duration > 0 && t != null ? (t / duration) * 100 : null;
  const introS = markerPct(parseTime(introStart));
  const introE = markerPct(parseTime(introEnd));
  const outroS = markerPct(parseTime(outroStart));
  const outroE = markerPct(parseTime(outroEnd));

  return (
    <div className={styles.deleteOverlay} onClick={onClose}>
      <div
        className={styles.epSettingsModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.epModalHeader}>
          <h3>
            Настройки — {episode.title || `Эпизод ${episode.number}`}{" "}
            <span
              style={{
                fontSize: 11,
                opacity: 0.5,
                fontWeight: 500,
                marginLeft: 8,
              }}
            >
              {episode.studio}
            </span>
          </h3>
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

        <div className={styles.epSettingsBody}>
          {/* Player */}
          <div className={styles.epPlayerWrap}>
            <video
              ref={vRef}
              className={styles.epSettingsVideo}
              onClick={togglePlay}
              playsInline
            />
            {/* custom timeline */}
            <div className={styles.epTimelineWrap}>
              <div
                className={styles.epTimeline}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const p = (e.clientX - r.left) / r.width;
                  seekTo(p * duration);
                }}
              >
                <div
                  className={styles.epTimelineBuffered}
                  style={{ width: `${bufferedPct}%` }}
                />
                <div
                  className={styles.epTimelineProgress}
                  style={{ width: `${progressPct}%` }}
                />
                {introS != null && introE != null && (
                  <div
                    className={styles.epTimelineMarkerOP}
                    style={{
                      left: `${introS}%`,
                      width: `${Math.max(0, introE - introS)}%`,
                    }}
                    title="Опенинг"
                  />
                )}
                {outroS != null && outroE != null && (
                  <div
                    className={styles.epTimelineMarkerED}
                    style={{
                      left: `${outroS}%`,
                      width: `${Math.max(0, outroE - outroS)}%`,
                    }}
                    title="Эндинг"
                  />
                )}
              </div>
            </div>

            <div className={styles.epPlayerControls}>
              <button
                className={styles.epPlayerBtn}
                onClick={() => seekBy(-10)}
                title="-10 секунд"
              >
                <SkipBack size={16} />
              </button>
              <button
                className={styles.epPlayerBtnPlay}
                onClick={togglePlay}
                title={playing ? "Пауза" : "Играть"}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                className={styles.epPlayerBtn}
                onClick={() => seekBy(10)}
                title="+10 секунд"
              >
                <SkipForward size={16} />
              </button>
              <span className={styles.epPlayerTime}>
                {formatTime(current)} / {formatTime(duration)}
              </span>
              <div className={styles.epPlayerSpacer} />
              <select
                className={styles.epPlayerSpeed}
                value={speed}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSpeed(v);
                  if (vRef.current) vRef.current.playbackRate = v;
                }}
                title="Скорость"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
              <button
                className={styles.epPlayerBtn}
                onClick={() => {
                  const v = vRef.current;
                  if (!v) return;
                  v.muted = !v.muted;
                  setMuted(v.muted);
                }}
                title={muted ? "Включить звук" : "Выключить звук"}
              >
                {muted || volume === 0 ? (
                  <VolumeX size={16} />
                ) : volume < 0.5 ? (
                  <Volume1 size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  if (vRef.current) {
                    vRef.current.volume = v;
                    vRef.current.muted = v === 0;
                    setMuted(v === 0);
                  }
                }}
                className={styles.epPlayerVolume}
              />
            </div>
          </div>

          {/* Right side: settings */}
          <div className={styles.epSettingsSide}>
            {/* Title */}
            <div className={styles.epSettingsSection}>
              <div className={styles.epSettingsSectionTitle}>
                Название эпизода
              </div>
              <input
                className={styles.epTitleInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Эпизод ${episode.number}`}
              />
            </div>

            {/* Preview / cover */}
            <div className={styles.epSettingsSection}>
              <div className={styles.epSettingsSectionTitle}>Обложка</div>
              <div className={styles.epCoverRow}>
                <div className={styles.epCoverPreview}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" />
                  ) : (
                    <div className={styles.epCoverPlaceholder}>
                      <Image size={18} />
                    </div>
                  )}
                </div>
                <div className={styles.epCoverActions}>
                  <button
                    type="button"
                    className={styles.epCaptureBtn}
                    onClick={captureFrame}
                    title="Сделать скриншот текущего кадра плеера"
                  >
                    <Camera size={13} />
                    Скрин с плеера
                  </button>
                  <label className={styles.epUploadCoverBtn}>
                    {previewUploading ? (
                      <>
                        <Loader2 size={13} className={styles.saveSpin} />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        Загрузить обложку
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handlePreviewUpload}
                      disabled={previewUploading}
                    />
                  </label>
                </div>
              </div>
              {pendingCover && (
                <div className={styles.episodeSuccess}>
                  <Camera size={13} /> Кадр захвачен — нажмите «Сохранить», чтобы
                  применить
                </div>
              )}
              {previewErr && (
                <div className={styles.episodeError}>
                  <AlertTriangle size={13} /> {previewErr}
                </div>
              )}
            </div>

            {/* Markers */}
            <div className={styles.epSettingsSection}>
              <div className={styles.epSettingsSectionTitle}>
                Опенинг (OP)
              </div>
              <div className={styles.epMarkerRow}>
                <MarkerInput
                  label="Начало"
                  value={introStart}
                  setValue={setIntroStart}
                  onUseCurrent={() => useCurrentFor(setIntroStart)}
                  onJump={() => jumpTo(introStart)}
                />
                <MarkerInput
                  label="Конец"
                  value={introEnd}
                  setValue={setIntroEnd}
                  onUseCurrent={() => useCurrentFor(setIntroEnd)}
                  onJump={() => jumpTo(introEnd)}
                />
              </div>
            </div>

            <div className={styles.epSettingsSection}>
              <div className={styles.epSettingsSectionTitle}>
                Эндинг (ED)
              </div>
              <div className={styles.epMarkerRow}>
                <MarkerInput
                  label="Начало"
                  value={outroStart}
                  setValue={setOutroStart}
                  onUseCurrent={() => useCurrentFor(setOutroStart)}
                  onJump={() => jumpTo(outroStart)}
                />
                <MarkerInput
                  label="Конец"
                  value={outroEnd}
                  setValue={setOutroEnd}
                  onUseCurrent={() => useCurrentFor(setOutroEnd)}
                  onJump={() => jumpTo(outroEnd)}
                />
              </div>
            </div>

            {saveErr && (
              <div className={styles.episodeError}>
                <AlertTriangle size={13} /> {saveErr}
              </div>
            )}
            {saveOk && (
              <div className={styles.episodeSuccess}>
                <Check size={13} /> Сохранено
              </div>
            )}

            <div className={styles.epSettingsFooter}>
              <button
                className={styles.deleteModalCancel}
                onClick={onClose}
                disabled={saving}
              >
                Закрыть
              </button>
              {/* Save only the title */}
              <button
                className={styles.epSaveMarkersBtn}
                onClick={() => handleSave("title")}
                disabled={saving || title.trim() === (episode.title || "")}
                title="Сохранить только название"
              >
                {saving ? (
                  <Loader2 size={13} className={styles.saveSpin} />
                ) : (
                  <Pencil size={14} />
                )}
                Только название
              </button>
              {/* Save only the captured screenshot as the cover */}
              <button
                className={styles.epSaveCoverBtn}
                onClick={() => handleSave("cover")}
                disabled={saving || !pendingCover}
                title={
                  pendingCover
                    ? "Сохранить только обложку"
                    : "Сначала сделайте скрин с плеера"
                }
              >
                {saving ? (
                  <Loader2 size={13} className={styles.saveSpin} />
                ) : (
                  <Camera size={14} />
                )}
                Только скрин
              </button>
              {/* Save only the OP/ED markers */}
              <button
                className={styles.epSaveMarkersBtn}
                onClick={() => handleSave("markers")}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={13} className={styles.saveSpin} />
                ) : (
                  <Clock size={14} />
                )}
                Только метки
              </button>
              {/* Save everything at once */}
              <button
                className={styles.episodeAddBtn}
                onClick={() => handleSave("all")}
                disabled={saving}
                style={{ marginTop: 0 }}
              >
                {saving ? (
                  <>
                    <Loader2 size={13} className={styles.saveSpin} />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Сохранить всё
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkerInput({
  label,
  value,
  setValue,
  onUseCurrent,
  onJump,
}: {
  label: string;
  value: string;
  setValue: (s: string) => void;
  onUseCurrent: () => void;
  onJump: () => void;
}) {
  return (
    <div className={styles.epMarkerField}>
      <label>{label}</label>
      <div className={styles.epMarkerInputRow}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0:00"
        />
        <button
          type="button"
          className={styles.epMarkerBtn}
          onClick={onUseCurrent}
          title="Использовать текущий момент"
        >
          <Clock size={14} />
        </button>
        <button
          type="button"
          className={styles.epMarkerBtn}
          onClick={onJump}
          title="Перейти к метке"
          disabled={!value.trim()}
        >
          <Play size={13} />
        </button>
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
  const [studios, setStudios] = useState<string[]>([]);
  const [loadingStudios, setLoadingStudios] = useState(true);
  const [editStudioEpId, setEditStudioEpId] = useState<number | null>(null);
  const [editStudioSaving, setEditStudioSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [animeRes, studioRes] = await Promise.all([
          fetch(`${API_URL}/api/anime`),
          fetch(`${API_URL}/api/studios`),
        ]);

          if (animeRes.ok) {
          const data = await animeRes.json();
          setAnimeList(data);
        }

        if (studioRes.ok) {
          const studioData = await studioRes.json();
          const names = Array.isArray(studioData)
            ? studioData.map((s: { name?: string }) => s.name).filter((n): n is string => Boolean(n))
            : [];
          setStudios([...new Set(names)]);
        } else {
          setStudios([]);
        }
      } catch {
        setStudios([]);
      } finally {
        setLoading(false);
        setLoadingStudios(false);
      }
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

  useEffect(() => {
    if (selectedAnime && !form.studio && studios.length > 0) {
      setForm((f) => ({ ...f, studio: studios[0] }));
    }
  }, [studios, selectedAnime, form.studio]);

  // Lock body scroll while a modal is open so the confirm dialog stays
  // properly centered over the viewport and background doesn't scroll.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const anyOpen = Boolean(deleteTarget) || Boolean(modalEp);
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [deleteTarget, modalEp]);

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
    return [...new Set(episodes.map((e) => e.studio).filter((s): s is string => Boolean(s)))].sort();
  }, [episodes]);

  useEffect(() => {
    if (episodeStudios.length > 0 && !vcStudio) setVcStudio(episodeStudios[0]);
  }, [episodeStudios, vcStudio]);

  const vcByStudio = useMemo(() => {
    const active = vcStudio || episodeStudios[0] || "";
    return voiceCast.filter((vc) => vc.studio === active);
  }, [voiceCast, vcStudio, episodeStudios]);

  const filteredEpisodes = useMemo(() => {
    let list = episodes;
    if (filterStudio) {
      list = list.filter((e) => e.studio === filterStudio);
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
    setForm((prev) => ({
      ...prev,
      studio: prev.studio || studios[0] || "",
    }));
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
    if (!form.studio.trim()) {
      setError("Выберите студию");
      return;
    }
    setUploading(true);
    setUploadPercent(0);
    setUploadPhase("uploading");
    setError(null);

    const animeId = selectedAnime.id;
    // Keep the studio used for this upload so it isn't reset afterwards.
    const uploadStudio = form.studio.trim();

    // Query params вместо FormData — файл идёт raw потоком на диск сервера
    const params = new URLSearchParams();
    params.set("animeId", String(animeId));
    params.set("number", String(num));
    if (form.title.trim()) params.set("title", form.title.trim());
    params.set("studio", uploadStudio);
    if (user?.id) params.set("grantXpUserId", String(user.id));
    params.set("filename", file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${CONV_URL}/api/episodes/upload?${params.toString()}`);

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
        // Keep the same studio that was used for this upload — don't reset it.
        setForm({ ...emptyForm, studio: uploadStudio });
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

    xhr.send(file);
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

  const handleChangeStudio = async (epId: number, newStudio: string) => {

    if (!selectedAnime) return;
    if (!user?.username) {
      setError("Требуется авторизация");
      return;
    }
    setEditStudioSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/episodes/${epId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studio: newStudio, username: user.username }),
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
    if (!user?.username) {
      setError("Требуется авторизация");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/episodes/${deleteTarget.id}?username=${encodeURIComponent(user.username)}`, {
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
                <select
                  value={form.studio}
                  onChange={(e) => setForm({ ...form, studio: e.target.value })}
                  className={styles.episodeFormSelect}
                  disabled={loadingStudios || studios.length === 0}
                >
                  <option value="" disabled>
                    {loadingStudios
                      ? "Загрузка студий..."
                      : studios.length === 0
                        ? "Студии не найдены"
                        : "Выберите студию"}
                  </option>
                  {studios.map((studio) => (
                    <option key={studio} value={studio}>
                      {studio}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!loadingStudios && studios.length === 0 && (
              <div className={styles.episodeError}>
                <AlertTriangle size={13} />
                Студии не найдены. Сначала добавьте студии на сайте.
              </div>
            )}

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

                    {/* Settings button — opens episode settings modal
                        with player, cover upload, and OP/ED markers */}
                    {ep.status === "ready" && ep.hlsUrl && (
                      <button
                        className={styles.episodeSettingsBtn}
                        onClick={() => setModalEp(ep)}
                        title="Настройки эпизода"
                      >
                        <Settings size={14} />
                        <span>Настройки</span>
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

      {/* Episode settings modal (player + cover + OP/ED markers) */}
      {modalEp &&
        typeof document !== "undefined" &&
        createPortal(
          <EpisodeSettingsModal
            episode={modalEp}
            onClose={() => setModalEp(null)}
            apiUrl={API_URL}
            username={user?.username}
            onSaved={(updated) => {
              setEpisodes((eps) =>
                eps.map((e) =>
                  e.id === modalEp.id ? { ...e, ...updated } : e,
                ),
              );
              setModalEp((cur) =>
                cur && cur.id === modalEp.id ? { ...cur, ...updated } : cur,
              );
            }}
            onPreviewUploaded={(url) => {
              setEpisodes((eps) =>
                eps.map((e) =>
                  e.id === modalEp.id ? { ...e, previewUrl: url } : e,
                ),
              );
              setModalEp((cur) =>
                cur && cur.id === modalEp.id
                  ? { ...cur, previewUrl: url }
                  : cur,
              );
            }}
          />,
          document.body,
        )}

      {/* Delete confirm modal — rendered in a portal to escape the
          transformed .tabContent containing block, so `position: fixed`
          covers the whole viewport (incl. sidebar / tabs). */}
      {deleteTarget &&
        typeof document !== "undefined" &&
        createPortal(
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
          </div>,
          document.body,
        )}
    </div>
  );
}

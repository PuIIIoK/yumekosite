"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Hls from "hls.js";
import { API_URL } from "@/config/hosts";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  Loader2,
} from "lucide-react";
import styles from "./player.module.scss";

interface EpisodeInfo {
  id: number;
  number: number;
  title: string | null;
  hlsUrl: string | null;
}

interface Props {
  src: string;
  episodes?: EpisodeInfo[];
  currentEpisodeId?: number;
  onEpisodeChange?: (ep: EpisodeInfo) => void;
  accent?: string;
  autoPlay?: boolean;
  userId?: number | null;
}

const VOLUME_KEY = "yumeko_player_volume";
const MUTED_KEY = "yumeko_player_muted";

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VideoPlayer({
  src,
  episodes = [],
  currentEpisodeId,
  onEpisodeChange,
  accent = "var(--accent)",
  autoPlay = true,
  userId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);

  // Volume — load from localStorage
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 1;
    const saved = localStorage.getItem(VOLUME_KEY);
    return saved ? parseFloat(saved) : 1;
  });
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTED_KEY) === "true";
  });
  const [showVolume, setShowVolume] = useState(false);

  // Save volume to localStorage
  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem(MUTED_KEY, String(muted));
  }, [muted]);

  // ── Watch progress: save every 5 seconds ──
  useEffect(() => {
    if (!userId || !currentEpisodeId) return;

    progressSaveTimer.current = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || !v.duration) return;
      fetch(`${API_URL}/api/watch-progress?userId=${userId}&episodeId=${currentEpisodeId}&watchedSeconds=${v.currentTime}&totalSeconds=${v.duration}`, {
        method: "POST",
      }).catch(() => {});
    }, 5000);

    return () => {
      if (progressSaveTimer.current) clearInterval(progressSaveTimer.current);
    };
  }, [userId, currentEpisodeId]);

  // Save progress on unmount / episode change
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v && userId && currentEpisodeId && v.duration) {
        navigator.sendBeacon(
          `${API_URL}/api/watch-progress?userId=${userId}&episodeId=${currentEpisodeId}&watchedSeconds=${v.currentTime}&totalSeconds=${v.duration}`
        );
      }
    };
  }, [userId, currentEpisodeId]);

  // UI
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  // Menus
  const [showQuality, setShowQuality] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [qualities, setQualities] = useState<{ index: number; label: string; height: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto

  // Episodes
  const sorted = [...episodes].sort((a, b) => a.number - b.number);
  const currentIdx = sorted.findIndex((e) => e.id === currentEpisodeId);
  const prevEp = currentIdx > 0 ? sorted[currentIdx - 1] : null;
  const nextEp = currentIdx >= 0 && currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

  // ── Resume position ──
  const resumeFetched = useRef(false);

  const fetchAndResume = useCallback(async (video: HTMLVideoElement) => {
    if (!userId || !currentEpisodeId) return;
    try {
      const res = await fetch(`${API_URL}/api/watch-progress?userId=${userId}&episodeId=${currentEpisodeId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.watchedSeconds > 0 && !data.completed) {
        video.currentTime = data.watchedSeconds;
        setCurrentTime(data.watchedSeconds);
      }
    } catch {}
  }, [userId, currentEpisodeId]);

  // ── HLS setup ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    resumeFetched.current = false;

    if (Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        const levels = data.levels.map((l, i) => ({
          index: i,
          label: `${l.height}p`,
          height: l.height,
        }));
        setQualities(levels);
        setCurrentQuality(-1);
        if (!resumeFetched.current) {
          resumeFetched.current = true;
          fetchAndResume(video).then(() => {
            if (autoPlay) video.play().catch(() => {});
          });
        } else {
          if (autoPlay) video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        if (currentQuality === -1) {
          // still auto
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        fetchAndResume(video).then(() => {
          if (autoPlay) video.play().catch(() => {});
        });
      });
    }
  }, [src]);

  // ── Video events ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      if (!seeking) setCurrentTime(v.currentTime);
    };
    const onDuration = () => setDuration(v.duration);
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEnded = () => {
      setPlaying(false);
      if (nextEp && onEpisodeChange) onEpisodeChange(nextEp);
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDuration);
    v.addEventListener("progress", onProgress);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("ended", onEnded);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDuration);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("ended", onEnded);
    };
  }, [seeking, nextEp, onEpisodeChange]);

  // ── Volume sync ──
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.volume = volume;
      v.muted = muted;
    }
  }, [volume, muted]);

  // ── Fullscreen ──
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Auto-hide controls ──
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setControlsVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [playing]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          showControls();
          break;
        case "ArrowLeft":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 5);
          showControls();
          break;
        case "ArrowRight":
          e.preventDefault();
          v.currentTime = Math.min(v.duration, v.currentTime + 5);
          showControls();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.1));
          setMuted(false);
          showControls();
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.1));
          showControls();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          setMuted((m) => !m);
          showControls();
          break;
        case "Escape":
          setShowQuality(false);
          setShowEpisodes(false);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showControls]);

  // ── Actions ──
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  const seekFromEvent = useCallback((clientX: number) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setCurrentTime(pct * duration);
    setHoverTime(pct * duration);
    setHoverX(clientX - rect.left);
    return pct;
  }, [duration]);

  const handleProgressMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSeeking(true);
    seekFromEvent(e.clientX);

    const onMove = (ev: MouseEvent) => {
      seekFromEvent(ev.clientX);
    };
    const onUp = (ev: MouseEvent) => {
      const bar = progressRef.current;
      const v = videoRef.current;
      if (bar && v && duration) {
        const rect = bar.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        v.currentTime = pct * duration;
      }
      setSeeking(false);
      setHoverTime(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleProgressHover = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (seeking) return;
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleQualityChange = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (index === -1) {
      hls.currentLevel = -1;
    } else {
      hls.currentLevel = index;
    }
    setCurrentQuality(index);
    setShowQuality(false);
  };

  const currentQualityLabel = currentQuality === -1
    ? `Авто${hlsRef.current && hlsRef.current.currentLevel >= 0 ? ` (${qualities[hlsRef.current.currentLevel]?.label || ""})` : ""}`
    : qualities.find((q) => q.index === currentQuality)?.label || "Авто";

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`${styles.player} ${controlsVisible ? styles.playerShowControls : ""} ${isFullscreen ? styles.playerFullscreen : ""}`}
      style={{ ["--player-accent" as string]: accent }}
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (playing) setControlsVisible(false);
        setShowVolume(false);
      }}
    >
      <video
        ref={videoRef}
        className={styles.video}
        onClick={togglePlay}
        playsInline
      />

      {/* Loading spinner */}
      {loading && playing && (
        <div className={styles.spinner}>
          <Loader2 size={48} className={styles.spinnerIcon} />
        </div>
      )}

      {/* Big play button (paused) */}
      {!playing && !loading && (
        <button className={styles.bigPlay} onClick={togglePlay}>
          <Play size={48} fill="white" stroke="none" />
        </button>
      )}

      {/* Gradient overlay */}
      <div className={styles.gradient} />

      {/* Top bar */}
      <div className={styles.topBar}>
        {currentEpisodeId && sorted.length > 0 && (
          <span className={styles.topTitle}>
            Эпизод {sorted.find((e) => e.id === currentEpisodeId)?.number}
            {sorted.find((e) => e.id === currentEpisodeId)?.title
              ? ` — ${sorted.find((e) => e.id === currentEpisodeId)?.title}`
              : ""}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {/* Progress bar */}
        <div
          ref={progressRef}
          className={`${styles.progressWrap} ${seeking ? styles.progressSeeking : ""}`}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => { if (!seeking) setHoverTime(null); }}
        >
          <div className={styles.progressTrack}>
            <div className={styles.progressBuffered} style={{ width: `${bufferedPct}%` }} />
            <div className={styles.progressFill} style={{ width: `${progress}%` }}>
              <div className={styles.progressThumb} />
            </div>
          </div>
          {hoverTime !== null && (
            <div className={styles.progressTooltip} style={{ left: hoverX }}>
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Bottom controls row */}
        <div className={styles.controlsRow}>
          {/* Left */}
          <div className={styles.controlsLeft}>
            {/* Prev episode */}
            <button
              className={styles.controlBtn}
              onClick={() => prevEp && onEpisodeChange?.(prevEp)}
              disabled={!prevEp}
              title="Предыдущий эпизод"
            >
              <SkipBack size={18} />
            </button>

            {/* Play/Pause */}
            <button className={styles.controlBtn} onClick={togglePlay} title={playing ? "Пауза" : "Воспроизвести"}>
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>

            {/* Next episode */}
            <button
              className={styles.controlBtn}
              onClick={() => nextEp && onEpisodeChange?.(nextEp)}
              disabled={!nextEp}
              title="Следующий эпизод"
            >
              <SkipForward size={18} />
            </button>

            {/* Volume */}
            <div
              className={styles.volumeWrap}
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <button
                className={styles.controlBtn}
                onClick={() => setMuted((m) => !m)}
                title={muted ? "Включить звук" : "Выключить звук"}
              >
                <VolumeIcon size={20} />
              </button>
              {showVolume && (
                <div className={styles.volumeSlider}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (val > 0) setMuted(false);
                    }}
                    className={styles.volumeInput}
                    style={{ ["--vol-pct" as string]: `${(muted ? 0 : volume) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Time */}
            <span className={styles.time}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right */}
          <div className={styles.controlsRight}>
            {/* Episode list */}
            {sorted.length > 1 && (
              <div className={styles.menuWrap}>
                <button
                  className={styles.controlBtn}
                  onClick={() => { setShowEpisodes(!showEpisodes); setShowQuality(false); }}
                  title="Список серий"
                >
                  <ListVideo size={20} />
                </button>
                {showEpisodes && (
                  <div className={styles.menu}>
                    <div className={styles.menuHeader}>Серии</div>
                    <div className={styles.menuScroll}>
                      {sorted.map((ep) => (
                        <button
                          key={ep.id}
                          className={`${styles.menuItem} ${ep.id === currentEpisodeId ? styles.menuItemActive : ""}`}
                          onClick={() => {
                            if (ep.id !== currentEpisodeId) onEpisodeChange?.(ep);
                            setShowEpisodes(false);
                          }}
                        >
                          <span className={styles.menuItemNum}>{ep.number}</span>
                          <span className={styles.menuItemTitle}>{ep.title || `Эпизод ${ep.number}`}</span>
                          {ep.id === currentEpisodeId && <Play size={12} className={styles.menuItemPlay} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quality */}
            {qualities.length > 0 && (
              <div className={styles.menuWrap}>
                <button
                  className={styles.controlBtn}
                  onClick={() => { setShowQuality(!showQuality); setShowEpisodes(false); }}
                  title="Качество"
                >
                  <Settings size={18} />
                </button>
                {showQuality && (
                  <div className={styles.menu}>
                    <div className={styles.menuHeader}>Качество</div>
                    <button
                      className={`${styles.menuItem} ${currentQuality === -1 ? styles.menuItemActive : ""}`}
                      onClick={() => handleQualityChange(-1)}
                    >
                      Авто
                    </button>
                    {[...qualities].sort((a, b) => b.height - a.height).map((q) => (
                      <button
                        key={q.index}
                        className={`${styles.menuItem} ${currentQuality === q.index ? styles.menuItemActive : ""}`}
                        onClick={() => handleQualityChange(q.index)}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button className={styles.controlBtn} onClick={toggleFullscreen} title={isFullscreen ? "Выход из полноэкранного" : "Полный экран"}>
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

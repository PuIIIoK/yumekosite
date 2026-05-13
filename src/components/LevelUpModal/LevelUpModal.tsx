"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { X } from "lucide-react";
import styles from "./LevelUpModal.module.scss";

// Same tier function as in profile page
function getLevelTier(level: number) {
  if (level >= 100)
    return {
      color: "#f59e0b",
      color2: "#ff8c00",
      tier: "legendary",
      label: "LEGENDARY",
    };
  if (level >= 85)
    return {
      color: "#c084fc",
      color2: "#8b5cf6",
      tier: "amethyst",
      label: "AMETHYST",
    };
  if (level >= 70)
    return {
      color: "#60a5fa",
      color2: "#3b82f6",
      tier: "sapphire",
      label: "SAPPHIRE",
    };
  if (level >= 50)
    return {
      color: "#34d399",
      color2: "#059669",
      tier: "emerald",
      label: "EMERALD",
    };
  if (level >= 30)
    return { color: "#fbbf24", color2: "#d97706", tier: "gold", label: "GOLD" };
  if (level >= 15)
    return {
      color: "#cbd5e1",
      color2: "#94a3b8",
      tier: "silver",
      label: "SILVER",
    };
  if (level >= 5)
    return {
      color: "#c97c3a",
      color2: "#8b4513",
      tier: "bronze",
      label: "BRONZE",
    };
  return {
    color: "#6b7280",
    color2: "#4b5563",
    tier: "novice",
    label: "NOVICE",
  };
}

export default function LevelUpModal() {
  const { levelUpInfo, clearLevelUp } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Блокируем скролл пока модалка открыта
  useEffect(() => {
    if (!levelUpInfo) return;
    const prev = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      document.body.style.overflow = prev;
      document.body.style.paddingRight = prevPad;
    };
  }, [levelUpInfo]);

  useEffect(() => {
    if (!levelUpInfo) return;

    // Играем звук
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/lvl_up.ogg");
      }
      audioRef.current.volume = 0.25;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}

    // Автозакрытие через 7 секунд
    timerRef.current = setTimeout(clearLevelUp, 7000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [levelUpInfo]);

  if (!levelUpInfo) return null;

  const { newLevel, oldLevel } = levelUpInfo;
  const tier = getLevelTier(newLevel);
  const isLegendary = tier.tier === "legendary";

  const cssVars = {
    "--lum-accent": tier.color,
    "--lum-accent2": tier.color2,
  } as React.CSSProperties;

  return (
    <>
      {/* Wrapper = overlay + centering */}
      <div className={styles.wrapper} onClick={clearLevelUp}>
        <div
          className={`${styles.modal} ${styles[`modal_${tier.tier}`]}`}
          style={cssVars}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top gradient glow */}
          <div className={styles.topGlow} />

          {/* Close */}
          <button className={styles.closeBtn} onClick={clearLevelUp}>
            <X size={16} strokeWidth={2} />
          </button>

          {/* Header label */}
          <p className={styles.headerLabel}>// LEVEL UP</p>

          {/* Level transition */}
          <div className={styles.levelTransition}>
            <span className={styles.oldLevel}>
              {String(oldLevel).padStart(2, "0")}
            </span>
            <span className={styles.arrow}>→</span>
            <span
              className={`${styles.newLevel} ${isLegendary ? styles.newLevelLegendary : ""}`}
            >
              {String(newLevel).padStart(2, "0")}
            </span>
          </div>

          {/* Tier badge */}
          <div
            className={`${styles.tierBadge} ${styles[`tierBadge_${tier.tier}`]}`}
          >
            <span className={styles.tierLabel}>{tier.label}</span>
          </div>

          {/* Congrats text */}
          <p className={styles.congrats}>
            Поздравляем! Вы достигли{" "}
            <strong style={{ color: tier.color }}>{newLevel} уровня</strong>
          </p>

          {/* Progress bar (fills during auto-close) */}
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${styles[`progressFill_${tier.tier}`]}`}
            />
          </div>
        </div>
      </div>
    </>
  );
}

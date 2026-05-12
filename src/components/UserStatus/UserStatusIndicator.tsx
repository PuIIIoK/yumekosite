"use client";

import { useEffect } from "react";
import { Moon } from "lucide-react";
import { useStatus } from "@/context/StatusContext";
import styles from "./UserStatusIndicator.module.scss";

interface UserStatusIndicatorProps {
  userId: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  dotOnly?: boolean;
}

export default function UserStatusIndicator({
  userId,
  size = "md",
  showLabel = false,
  dotOnly = false,
}: UserStatusIndicatorProps) {
  const { subscribeToUsers, unsubscribeFromUsers, getStatus, fetchUserStatus } =
    useStatus();

  useEffect(() => {
    subscribeToUsers([userId]);
    // Моментальная загрузка через REST, не ждём WebSocket-пуша
    fetchUserStatus(userId);
    return () => unsubscribeFromUsers([userId]);
  }, [userId, subscribeToUsers, unsubscribeFromUsers, fetchUserStatus]);

  const info = getStatus(userId);
  const status = info?.status ?? "OFFLINE";
  const manual = info?.manualStatus;

  // Иконка — крупная, без подложки
  const iconSize = size === "lg" ? 20 : size === "md" ? 16 : 13;
  const dndIconSize = size === "lg" ? 24 : size === "md" ? 20 : 16;
  // Луна: маленькая, вписывается в тёмный кружок-бейдж
  const awayIconSize = size === "lg" ? 14 : size === "md" ? 11 : 9;

  const getDotClass = () => {
    // dotOnly=true  → бейдж-аватарка: тёмный кружок с иконкой внутри
    // dotOnly=false → профиль: прозрачный фон, иконка рядом с лейблом (без обводки/подложки)
    if (manual === "AWAY") return dotOnly ? styles.awayDot : styles.away;
    if (manual === "DND") return dotOnly ? styles.dndDot : styles.dndIcon;
    if (status === "ONLINE") return styles.online;
    if (status === "RECENTLY") return styles.recently;
    return styles.offline;
  };

  const getLabel = () => {
    if (manual === "AWAY") return "Неактив";
    if (manual === "DND") return "Не беспокоить";
    if (manual === "INVISIBLE") return "Не в сети";
    switch (status) {
      case "ONLINE":
        return "В сети";
      case "RECENTLY":
        return "Недавно";
      default:
        return "Не в сети";
    }
  };

  const getTimeAgo = () => {
    if (!info?.lastSeen) return "";
    const date = new Date(info.lastSeen);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return `${Math.floor(diff / 86400)} д назад`;
  };

  // ONLINE → время последней активности
  // AWAY   → время последней активности
  // DND    → фиксированная строка "Был недавно"
  // INVISIBLE/OFFLINE → ничего
  const showTimeAgo =
    manual !== "DND" && manual !== "INVISIBLE" && status !== "OFFLINE";

  return (
    <div className={`${styles.statusIndicator} ${styles[size]}`}>
      <span className={`${styles.dot} ${getDotClass()}`}>
        {manual === "AWAY" && (
          // Луна: маленькая в бейдже (awayDot) или крупная рядом с лейблом
          <Moon
            size={dotOnly ? awayIconSize : iconSize}
            strokeWidth={2}
            className={styles.dotIcon}
            style={{ color: "#f59e0b" }}
          />
        )}
        {manual === "DND" && (
          // DND SVG: маленький в бейдже (dndDot) или крупный рядом с лейблом (dndIcon)
          // В профиле (dndIcon) — без подложки, «без обводки»
          <svg
            width={dotOnly ? awayIconSize : dndIconSize}
            height={dotOnly ? awayIconSize : dndIconSize}
            viewBox="0 0 24 24"
            fill="none"
            className={styles.dotIcon}
          >
            <circle cx="12" cy="12" r="10" fill="#ef4444" />
            <line
              x1="8"
              y1="12"
              x2="16"
              y2="12"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      {showLabel && (
        <span className={styles.label}>
          {getLabel()}
          {manual === "DND" && (
            <span className={styles.timeAgo}> • Был недавно</span>
          )}
          {manual !== "DND" && info?.lastSeen && showTimeAgo && (
            <span className={styles.timeAgo}> • {getTimeAgo()}</span>
          )}
        </span>
      )}
    </div>
  );
}

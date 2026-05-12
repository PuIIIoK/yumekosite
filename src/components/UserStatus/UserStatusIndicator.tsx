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
  const manual = info?.manualStatus as
    | "ONLINE"
    | "AWAY"
    | "DND"
    | "INVISIBLE"
    | undefined;

  const iconSize = size === "lg" ? 20 : size === "md" ? 16 : 13;
  const dndIconSize = size === "lg" ? 24 : size === "md" ? 20 : 16;
  const awayIconSize = size === "lg" ? 14 : size === "md" ? 11 : 9;

  // Сессия активна, если сервер видит heartbeat или пользователь вышел в AWAY/DND
  // (RECENTLY = сервер перевёл их в RECENTLY, не ONLINE)
  const hasActiveSession = status === "ONLINE" || status === "RECENTLY";

  // Пользователь присутствует — если есть активная сессия И он не INVISIBLE
  // OFFLINE — никогда не считается присутствующим, даже если раньше был AWAY/DND
  const isPresent = hasActiveSession && manual !== "INVISIBLE";

  const getDotClass = () => {
    if (!isPresent) {
      // Фулл-оффлайн: серая точка. Иконок AWAY/DND нет — пользователь вышел с сайта
      return styles.offline;
    }
    if (manual === "AWAY") return dotOnly ? styles.awayDot : styles.away;
    if (manual === "DND") return dotOnly ? styles.dndDot : styles.dndIcon;
    if (status === "ONLINE") return styles.online;
    return styles.recently;
  };

  const getLabel = () => {
    if (manual === "INVISIBLE") return "Не в сети";
    if (!isPresent) return "Не в сети";
    if (manual === "AWAY") return "Неактив";
    if (manual === "DND") return "Не беспокоить";
    return "В сети";
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

  // Время показываем только когда пользователь полностью оффлайн (OFFLINE)
  // При AWAY/DND+активная сессия (RECENTLY) — время не показываем
  const showRealTime =
    status === "OFFLINE" && !!info?.lastSeen && manual !== "INVISIBLE";

  return (
    <div className={`${styles.statusIndicator} ${styles[size]}`}>
      <span className={`${styles.dot} ${getDotClass()}`}>
        {/* AWAY: луна только при активной сессии. При OFFLINE — никакой иконки */}
        {manual === "AWAY" && isPresent && (
          <Moon
            size={dotOnly ? awayIconSize : iconSize}
            strokeWidth={2}
            className={styles.dotIcon}
            style={{ color: "#f59e0b" }}
          />
        )}
        {/* DND: красный кружок только при активной сессии. При OFFLINE — никакой иконки */}
        {manual === "DND" && isPresent && (
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
          {showRealTime && (
            <span className={styles.timeAgo}> • {getTimeAgo()}</span>
          )}
        </span>
      )}
    </div>
  );
}

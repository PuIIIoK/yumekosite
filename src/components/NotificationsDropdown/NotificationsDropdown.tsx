"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  X,
  Check,
  UserPlus,
  Users,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Film,
  UserCheck,
  FilePenLine,
} from "lucide-react";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/hosts";
import styles from "./NotificationsDropdown.module.scss";

interface Notification {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
  relatedUserId?: number;
  relatedUsername?: string;
  relatedUserDisplayName?: string;
  relatedUserHasAvatar?: boolean;
  relatedAnimeId?: number;
  relatedAnimeTitle?: string;
  relatedStudioName?: string;
}

function parseResponsePayload(payload: string): { notifications?: Notification[]; hasMore?: boolean } | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {}

  const bytes: number[] = [];
  for (const line of payload.split("\n")) {
    if (!line.trim()) continue;
    const hexPart = line.substring(10, 58).trim();
    for (const h of hexPart.split(/\s+/)) {
      if (h.length === 2) bytes.push(parseInt(h, 16));
    }
  }

  if (bytes.length === 0) return null;

  const decoded = new TextDecoder().decode(new Uint8Array(bytes)).trim();
  if (!decoded) return null;

  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "только что";
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffHour < 24) return `${diffHour} ч. назад`;
  if (diffDay < 7) return `${diffDay} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const SEEN_STORAGE_PREFIX = "yumeko:seenNotifications:";

export default function NotificationsDropdown() {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const seenNotificationIds = useRef<Set<number>>(new Set());
  // Whether we've already loaded notifications once for the current session.
  // Used to avoid replaying browser notifications (with sound) on page reload.
  const hasInitialisedRef = useRef(false);

  const getSeenStorageKey = () => {
    const username = auth.user?.username?.trim().toLowerCase();
    return username ? `${SEEN_STORAGE_PREFIX}${username}` : null;
  };

  const persistSeenIds = () => {
    const key = getSeenStorageKey();
    if (!key || typeof window === "undefined") return;
    try {
      // Keep only the most recent ids to avoid unbounded growth.
      const ids = Array.from(seenNotificationIds.current).slice(-500);
      window.localStorage.setItem(key, JSON.stringify(ids));
    } catch {}
  };

  const loadSeenIds = () => {
    const key = getSeenStorageKey();
    if (!key || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const ids: number[] = JSON.parse(raw);
        seenNotificationIds.current = new Set(ids);
      }
    } catch {}
  };


  const fetchNotifications = async (limit = 10, silent = false) => {
    if (!auth.user) return;
    const username = auth.user.username.trim().toLowerCase();

    try {
       const res = await fetch(`${API_URL}/api/notifications/${username}?page=0&size=${limit}`);
      if (res.ok) {
        const data = parseResponsePayload(await res.text()) ?? {};

         const nextNotifications: Notification[] = data.notifications || [];

         if (silent) {
           const unseen = nextNotifications.filter((n) => !seenNotificationIds.current.has(n.id));
           if (unseen.length > 0) {
             setNotifications((prev) => {
               const merged = [...unseen, ...prev];
               const deduped = merged.filter(
                 (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
               );
               return deduped.sort(
                 (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
               );
             });
             for (const item of unseen) {
               seenNotificationIds.current.add(item.id);
             }
           }
         } else {
           setNotifications(nextNotifications);
           for (const item of nextNotifications) {
             seenNotificationIds.current.add(item.id);
           }
         }

         setHasMore(data.hasMore || false);
       }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    if (!auth.user) return;
    const username = auth.user.username.trim().toLowerCase();
    // Optimistic update
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await fetch(`${API_URL}/api/notifications/${username}/mark-read/${id}`, {
        method: "PUT",
      });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    if (!auth.user) return;
    const username = auth.user.username.trim().toLowerCase();
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch(`${API_URL}/api/notifications/${username}/mark-all-read`, {
        method: "PUT",
      });
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  const pushBrowserNotification = (notification: Notification) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const body = notification.message || notification.relatedStudioName || "Новое уведомление";
    const title =
      notification.type === "collab_request_approved"
        ? "Студия одобрена"
        : notification.type === "collab_request_submitted"
          ? "Заявка на студию отправлена"
          : notification.type === "STUDIO_SUBMITTED"
            ? "Заявка на студию отправлена"
            : notification.type === "STUDIO_ROLE_REQUEST"
              ? "Запрос в студию"
              : "Yumeko";

    new Notification(title, {
      body,
      icon: "/favicon.png",
    });
  };

  useEffect(() => {
    if (isOpen && auth.user) {
      fetchNotifications();
    }
  }, [isOpen, auth.user]);

  useEffect(() => {
    if (!auth.user) return;

    // Reset the init flag and load previously seen ids for this user, so a page
    // reload does not re-announce notifications that were already delivered.
    hasInitialisedRef.current = false;
    loadSeenIds();

    const pollAndNotify = async () => {
      const username = auth.user?.username?.trim().toLowerCase();
      if (!username) return;

      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }

      try {
        const res = await fetch(`${API_URL}/api/notifications/${username}?page=0&size=20`);
        if (!res.ok) return;
        const data = parseResponsePayload(await res.text()) ?? {};
        const nextNotifications: Notification[] = data.notifications || [];

        const latestKnownIds = new Set(seenNotificationIds.current);
        const fresh = nextNotifications.filter((n) => !latestKnownIds.has(n.id));
        const isFirstLoad = !hasInitialisedRef.current;

        if (fresh.length > 0) {
          setNotifications((prev) => {
            const merged = [...fresh, ...prev];
            return merged.filter(
              (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
            );
          });

          for (const item of fresh) {
            seenNotificationIds.current.add(item.id);
            // Only announce (with sound) genuinely new notifications that arrive
            // while the page is open — never on the first load after a reload.
            if (!isFirstLoad) {
              pushBrowserNotification(item);
            }
          }
          persistSeenIds();
        }

        hasInitialisedRef.current = true;
        setHasMore(data.hasMore || false);
      } catch (err) {
        console.error("Failed to poll notifications", err);
      } finally {
        setLoading(false);
      }
    };

    pollAndNotify();
    const timer = setInterval(pollAndNotify, 15000);
    return () => clearInterval(timer);
  }, [auth.user?.username]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.notificationsContainer}`)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!auth.user) return;

    const pollNotifications = async () => {
      await fetchNotifications(20, true);
    };

    const refreshListener = () => {
      setTimeout(() => {
        fetchNotifications(20, true);
      }, 250);
    };

    window.addEventListener("notifications:refresh", refreshListener as EventListener);
    pollNotifications();
    const timer = setInterval(pollNotifications, 15000);

    return () => {
      clearInterval(timer);
      window.removeEventListener("notifications:refresh", refreshListener as EventListener);
    };
  }, [auth.user?.username]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Map a notification type to an icon + a color variant (for the icon background).
  const getIconMeta = (type: string): { icon: React.ReactNode; variant: string } => {
    switch (type) {
      case "friend_request":
        return { icon: <UserPlus size={18} />, variant: "info" };
      case "friend_request_accepted":
        return { icon: <UserCheck size={18} />, variant: "success" };
      case "friend_request_rejected":
        return { icon: <XCircle size={18} />, variant: "danger" };
      case "collab_request_submitted":
      case "STUDIO_SUBMITTED":
        return { icon: <Clock size={18} />, variant: "pending" };
      case "collab_request_approved":
      case "STUDIO_APPROVED":
        return { icon: <CheckCircle2 size={18} />, variant: "success" };
      case "STUDIO_REJECTED":
        return { icon: <XCircle size={18} />, variant: "danger" };
      case "STUDIO_ROLE_REQUEST":
        return { icon: <Users size={18} />, variant: "info" };
      case "ANIME_EDIT_SUBMITTED":
        return { icon: <FilePenLine size={18} />, variant: "pending" };
      case "ANIME_EDIT_APPROVED":
        return { icon: <CheckCircle2 size={18} />, variant: "success" };
      case "ANIME_EDIT_REJECTED":
        return { icon: <XCircle size={18} />, variant: "danger" };
      case "EPISODE_ADDED":

      case "NEW_EPISODE":
        return { icon: <Film size={18} />, variant: "info" };
      default:
        return { icon: <Bell size={18} />, variant: "default" };
    }
  };

  const getMessage = (notification: Notification) => {
    return notification.message;
  };

  return (
    <div className={styles.notificationsContainer}>
      <button
        className={`${styles.iconBtn} ${unreadCount > 0 ? styles.iconBtnUnread : ""}`}
        aria-label="Уведомления"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.unreadBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3>
              Уведомления
              {unreadCount > 0 && <span className={styles.headerCount}>{unreadCount}</span>}
            </h3>
            {unreadCount > 0 && (
              <button
                className={styles.markAllReadBtn}
                onClick={markAllAsRead}
              >
                <Check size={14} />
                Прочитать все
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>
              <Bell size={28} />
              <span>Нет уведомлений</span>
            </div>
          ) : (
            <>
              <div className={styles.notificationsList}>
                {notifications.map((notification) => {
                  const { icon, variant } = getIconMeta(notification.type);
                  const body = (
                    <>
                      <div className={`${styles.notificationIcon} ${styles[`icon_${variant}`] || ""}`}>
                        {icon}
                      </div>
                      <div className={styles.notificationContent}>
                        <p>{getMessage(notification)}</p>
                        <span className={styles.notificationTime}>
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      {!notification.isRead && <span className={styles.unreadDot} />}
                    </>
                  );

                  return notification.actionUrl ? (
                    <Link
                      key={notification.id}
                      href={notification.actionUrl}
                      className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ""}`}
                      onClick={() => {
                        markAsRead(notification.id);
                        setIsOpen(false);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div
                      key={notification.id}
                      className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ""}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      {body}
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className={styles.showMore}>
                  <Link href="/profile/notifications">
                    Показать еще
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

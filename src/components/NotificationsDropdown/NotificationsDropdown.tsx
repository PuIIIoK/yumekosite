"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, Check, UserPlus, Users, Play } from "lucide-react";
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

export default function NotificationsDropdown() {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const seenNotificationIds = useRef<Set<number>>(new Set());

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
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "POST",
      });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "POST",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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

        if (fresh.length > 0) {
          setNotifications((prev) => {
            const merged = [...fresh, ...prev];
            return merged.filter(
              (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
            );
          });

          for (const item of fresh) {
            seenNotificationIds.current.add(item.id);
            pushBrowserNotification(item);
          }
        }

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

  const getIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return <UserPlus size={16} />;
      case "friend_request_accepted":
        return <Check size={16} />;
      case "friend_request_rejected":
        return <X size={16} />;
      case "collab_request_submitted":
        return <Users size={16} />;
      case "collab_request_approved":
        return <Play size={16} />;
      case "STUDIO_SUBMITTED":
      case "STUDIO_ROLE_REQUEST":
        return <Users size={16} />;
      default:
        return <Bell size={16} />;
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
          <span className={styles.unreadBadge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3>Уведомления</h3>
            {unreadCount > 0 && (
              <button 
                className={styles.markAllReadBtn}
                onClick={markAllAsRead}
              >
                Отметить все как прочитанные
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>Нет уведомлений</div>
          ) : (
            <>
              <div className={styles.notificationsList}>
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ""}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className={styles.notificationIcon}>
                      {getIcon(notification.type)}
                    </div>
                    <div className={styles.notificationContent}>
                      <p>{getMessage(notification)}</p>
                      <span className={styles.notificationTime}>
                        {new Date(notification.createdAt).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                  </div>
                ))}
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
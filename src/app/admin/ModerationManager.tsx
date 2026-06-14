"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/config/hosts";
import { useAuth } from "@/context/AuthContext";
import styles from "./admin.module.scss";

interface CollaborationRequest {
  id: number;
  animeId: number;
  animeName: string;
  studioName: string;
  description: string | null;
  headUsername: string;
  avatar: string | null;
  banner: string | null;
  socials: string | null;
  website: string | null;
  contact: string;
  status: string;
  reviewerUsername: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export default function ModerationManager() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/collaboration-requests`);
      if (res.ok) {
        const data = await res.json();
        // Fetch anime names
        const enriched = await Promise.all(
          data.map(async (req: any) => {
            try {
              const animeRes = await fetch(`${API_URL}/api/anime/${req.animeId}`);
              if (animeRes.ok) {
                const anime = await animeRes.json();
                return { ...req, animeName: anime.title };
              }
            } catch {}
            return { ...req, animeName: `Аниме #${req.animeId}` };
          })
        );
        setRequests(enriched);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    if (!user) return;
    setProcessing(id);
    try {
      const res = await fetch(`${API_URL}/api/collaboration-requests/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUsername: user.username }),
      });
      if (res.ok) {
        await fetchRequests();
      }
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!user) return;
    const reason = prompt("Причина отказа:");
    if (reason === null) return;

    setProcessing(id);
    try {
      const res = await fetch(`${API_URL}/api/collaboration-requests/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUsername: user.username, reason }),
      });
      if (res.ok) {
        await fetchRequests();
      }
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className={styles.adminLoading}>Загрузка...</div>;
  }

  return (
    <div className={styles.adminContent}>
      <h1 className={styles.adminTitle}>Модерирование коллабораций</h1>
      <p className={styles.adminDescription}>
        Запросы на добавление студий озвучки к аниме
      </p>

      {requests.length === 0 ? (
        <div className={styles.emptyState}>Нет запросов на модерацию</div>
      ) : (
        <div className={styles.moderationList}>
          {requests.map((req) => (
            <div key={req.id} className={styles.moderationCard}>
              <div className={styles.moderationHeader}>
                <h3>{req.studioName}</h3>
                <span className={styles.moderationAnime}>{req.animeName}</span>
              </div>

              {req.avatar && (
                <img
                  src={req.avatar}
                  alt="Аватар"
                  className={styles.moderationAvatar}
                />
              )}

              <div className={styles.moderationDetails}>
                <div><strong>Глава:</strong> @{req.headUsername}</div>
                <div><strong>Контакт:</strong> {req.contact}</div>
                {req.description && <div><strong>Описание:</strong> {req.description}</div>}
                {req.website && <div><strong>Сайт:</strong> {req.website}</div>}
                {req.socials && <div><strong>Соцсети:</strong> {req.socials}</div>}
              </div>

              <div className={styles.moderationActions}>
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={processing === req.id}
                  className={styles.approveBtn}
                >
                  {processing === req.id ? "Обработка..." : "Принять"}
                </button>
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={processing === req.id}
                  className={styles.rejectBtn}
                >
                  {processing === req.id ? "Обработка..." : "Отклонить"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/config/hosts";
import { useAuth } from "@/context/AuthContext";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Globe,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
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

interface StudioRoleRequest {
  id: number;
  studioId: number;
  studioName: string;
  username: string;
  role: string;
  requestedBy: string;
  status: string;
  reviewerUsername: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const roleLabels: Record<string, string> = {
  ACTOR: "Актёр",
  RELIZER: "Релизёр",
  SOUND_DIRECTOR: "Звукорежиссёр",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status: string) {
  switch (status?.toLowerCase()) {
    case "approved":
      return "Одобрено";
    case "rejected":
      return "Отклонено";
    case "reviewed":
      return "Проверено";
    default:
      return "На модерации";
  }
}

export default function ModerationManager() {
  const { user } = useAuth();
  const [collabRequests, setCollabRequests] = useState<CollaborationRequest[]>([]);
  const [roleRequests, setRoleRequests] = useState<StudioRoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"studios" | "roles">("studios");

  const fetchAllRequests = async () => {
    try {
      const collabRes = await fetch(`${API_URL}/api/collaboration-requests`);
      if (collabRes.ok) {
        const data = await collabRes.json();
        const enriched = await Promise.all(
          data.map(async (req: CollaborationRequest) => {
            try {
              const animeRes = await fetch(`${API_URL}/api/anime/${req.animeId}`);
              if (animeRes.ok) {
                const anime = await animeRes.json();
                return { ...req, animeName: anime.title };
              }
            } catch {
              // ignore enrichment errors
            }
            return { ...req, animeName: `Аниме #${req.animeId}` };
          }),
        );
        setCollabRequests(enriched);
      }

      const roleRes = await fetch(`${API_URL}/api/studio-role-requests`);
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        setRoleRequests(roleData);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const handleApprove = async (id: number, type: "studio" | "role") => {
    if (!user) return;
    setProcessing(id);

    try {
      const res =
        type === "studio"
          ? await fetch(`${API_URL}/api/collaboration-requests/${id}/approve`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reviewerUsername: user.username }),
            })
          : await fetch(`${API_URL}/api/studio-role-requests/${id}/approve`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reviewerUsername: user.username }),
            });

      if (res.ok) await fetchAllRequests();
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number, type: "studio" | "role") => {
    if (!user) return;
    const reason = prompt("Причина отказа:");
    if (reason === null) return;

    setProcessing(id);
    try {
      const res =
        type === "studio"
          ? await fetch(`${API_URL}/api/collaboration-requests/${id}/reject`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reviewerUsername: user.username, reason }),
            })
          : await fetch(`${API_URL}/api/studio-role-requests/${id}/reject`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reviewerUsername: user.username, reason }),
            });

      if (res.ok) await fetchAllRequests();
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setProcessing(null);
    }
  };

  const studioRequests = useMemo(
    () => [...collabRequests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [collabRequests],
  );
  const studioRoleRequests = useMemo(
    () => [...roleRequests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [roleRequests],
  );

  const pendingStudioCount = studioRequests.length;
  const pendingRoleCount = studioRoleRequests.length;
  const totalCount = pendingStudioCount + pendingRoleCount;

  if (loading) {
    return <div className={styles.adminLoading}>Загрузка...</div>;
  }

  return (
    <div className={styles.moderationWrap}>
      <section className={styles.moderationHero}>
        <div className={styles.moderationHeroMain}>
          <div className={styles.moderationKicker}>Модерирование</div>
          <h1 className={styles.adminTitle}>Модерирование сайта</h1>
          <p className={styles.adminDescription}>
            Единая очередь запросов на студии и роли актёров. Проверяйте данные,
            принимайте решения и держите структуру без визуального шума.
          </p>

          <div className={styles.moderationTabs}>
            <button
              className={`${styles.moderationTab} ${activeTab === "studios" ? styles.active : ""}`}
              onClick={() => setActiveTab("studios")}
              type="button"
            >
              <Building2 size={14} />
              Студии
              <span>{pendingStudioCount}</span>
            </button>
            <button
              className={`${styles.moderationTab} ${activeTab === "roles" ? styles.active : ""}`}
              onClick={() => setActiveTab("roles")}
              type="button"
            >
              <Users size={14} />
              Роли актёров
              <span>{pendingRoleCount}</span>
            </button>
          </div>
        </div>

        <div className={styles.moderationStats}>
          <div className={styles.moderationStatCard}>
            <span className={styles.moderationStatLabel}>Всего заявок</span>
            <strong className={styles.moderationStatValue}>{totalCount}</strong>
          </div>
          <div className={styles.moderationStatCard}>
            <span className={styles.moderationStatLabel}>Студии</span>
            <strong className={styles.moderationStatValue}>{pendingStudioCount}</strong>
          </div>
          <div className={styles.moderationStatCard}>
            <span className={styles.moderationStatLabel}>Роли</span>
            <strong className={styles.moderationStatValue}>{pendingRoleCount}</strong>
          </div>
        </div>
      </section>

      {activeTab === "studios" && (
        <div className={styles.moderationSection}>
          <div className={styles.moderationSectionHeader}>
            <div>
              <h2 className={styles.moderationSectionTitle}>Запросы на студии</h2>
              <p className={styles.moderationSectionSubtitle}>
                Проверка баннеров, аватаров, контактов и профиля главы студии.
              </p>
            </div>
            <div className={styles.moderationSectionPill}>
              <Clock3 size={14} />
              {pendingStudioCount} на рассмотрении
            </div>
          </div>

          {studioRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <ShieldCheck size={22} />
              <div>
                <strong>Нет запросов на студии</strong>
                <span>Новые заявки появятся здесь автоматически.</span>
              </div>
            </div>
          ) : (
            <div className={styles.moderationGrid}>
              {studioRequests.map((req) => (
                <article key={req.id} className={styles.moderationCard}>
                  <div
                    className={styles.moderationCardBanner}
                    style={req.banner ? { backgroundImage: `url(${req.banner})` } : undefined}
                  >
                    <div className={styles.moderationCardOverlay} />
                    <div className={styles.moderationCardTopRow}>
                      <div className={styles.moderationAvatarWrap}>
                        {req.avatar ? (
                          <img src={req.avatar} alt={req.studioName} className={styles.moderationAvatar} />
                        ) : (
                          <div className={styles.moderationAvatarFallback}>
                            {req.studioName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <span className={`${styles.moderationStatus} ${styles.moderationStatusPending}`}>
                        <ShieldAlert size={12} />
                        {formatStatus(req.status)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.moderationCardBody}>
                    <div className={styles.moderationHeader}>
                      <div className={styles.moderationHeaderText}>
                        <h3>{req.studioName}</h3>
                        <p>{req.animeName}</p>
                      </div>
                      <span className={styles.moderationMetaBadge}>ID #{req.id}</span>
                    </div>

                    <div className={styles.moderationDetails}>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Глава</span>
                        <span className={styles.moderationDetailValue}>@{req.headUsername}</span>
                      </div>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Контакт</span>
                        <span className={styles.moderationDetailValue}>{req.contact}</span>
                      </div>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Создано</span>
                        <span className={styles.moderationDetailValue}>{formatDate(req.createdAt)}</span>
                      </div>
                      {req.description && (
                        <div className={styles.moderationDetailRowWide}>
                          <span className={styles.moderationDetailLabel}>Описание</span>
                          <span className={styles.moderationDetailValue}>{req.description}</span>
                        </div>
                      )}
                      {req.website && (
                        <div className={styles.moderationDetailRowWide}>
                          <span className={styles.moderationDetailLabel}>Сайт</span>
                          <span className={styles.moderationDetailValue}>{req.website}</span>
                        </div>
                      )}
                      {req.socials && (
                        <div className={styles.moderationDetailRowWide}>
                          <span className={styles.moderationDetailLabel}>Соцсети</span>
                          <span className={styles.moderationDetailValue}>{req.socials}</span>
                        </div>
                      )}
                      {req.reviewedAt && (
                        <div className={styles.moderationDetailRow}>
                          <span className={styles.moderationDetailLabel}>Проверено</span>
                          <span className={styles.moderationDetailValue}>{formatDate(req.reviewedAt)}</span>
                        </div>
                      )}
                      {req.reviewerUsername && (
                        <div className={styles.moderationDetailRow}>
                          <span className={styles.moderationDetailLabel}>Модератор</span>
                          <span className={styles.moderationDetailValue}>@{req.reviewerUsername}</span>
                        </div>
                      )}
                      {req.rejectionReason && (
                        <div className={styles.moderationDetailRowWide}>
                          <span className={styles.moderationDetailLabel}>Причина отказа</span>
                          <span className={styles.moderationDetailValue}>{req.rejectionReason}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.moderationActions}>
                      <button
                        onClick={() => handleApprove(req.id, "studio")}
                        disabled={processing === req.id}
                        className={styles.approveBtn}
                        type="button"
                      >
                        <CheckCircle2 size={14} />
                        {processing === req.id ? "Обработка..." : "Принять"}
                      </button>
                      <button
                        onClick={() => handleReject(req.id, "studio")}
                        disabled={processing === req.id}
                        className={styles.rejectBtn}
                        type="button"
                      >
                        <XCircle size={14} />
                        {processing === req.id ? "Обработка..." : "Отклонить"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "roles" && (
        <div className={styles.moderationSection}>
          <div className={styles.moderationSectionHeader}>
            <div>
              <h2 className={styles.moderationSectionTitle}>Запросы на роли</h2>
              <p className={styles.moderationSectionSubtitle}>
                Проверка ролей участников студий и привязки к аккаунтам.
              </p>
            </div>
            <div className={styles.moderationSectionPill}>
              <CalendarClock size={14} />
              {pendingRoleCount} на рассмотрении
            </div>
          </div>

          {studioRoleRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <ShieldCheck size={22} />
              <div>
                <strong>Нет запросов на роли</strong>
                <span>Новые заявки на роли будут отображаться здесь.</span>
              </div>
            </div>
          ) : (
            <div className={styles.moderationGrid}>
              {studioRoleRequests.map((req) => (
                <article key={req.id} className={styles.moderationCard}>
                  <div className={styles.moderationCardBody}>
                    <div className={styles.moderationHeader}>
                      <div className={styles.moderationHeaderText}>
                        <span className={styles.roleBadge}>{roleLabels[req.role] || req.role}</span>
                        <h3>{req.username}</h3>
                        <p>{req.studioName}</p>
                      </div>
                      <span className={styles.moderationMetaBadge}>ID #{req.id}</span>
                    </div>

                    <div className={styles.moderationDetails}>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Запросил</span>
                        <span className={styles.moderationDetailValue}>@{req.requestedBy}</span>
                      </div>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Создано</span>
                        <span className={styles.moderationDetailValue}>{formatDate(req.createdAt)}</span>
                      </div>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Статус</span>
                        <span className={styles.moderationDetailValue}>{formatStatus(req.status)}</span>
                      </div>
                      {req.reviewedAt && (
                        <div className={styles.moderationDetailRow}>
                          <span className={styles.moderationDetailLabel}>Проверено</span>
                          <span className={styles.moderationDetailValue}>{formatDate(req.reviewedAt)}</span>
                        </div>
                      )}
                      {req.reviewerUsername && (
                        <div className={styles.moderationDetailRow}>
                          <span className={styles.moderationDetailLabel}>Модератор</span>
                          <span className={styles.moderationDetailValue}>@{req.reviewerUsername}</span>
                        </div>
                      )}
                      {req.rejectionReason && (
                        <div className={styles.moderationDetailRowWide}>
                          <span className={styles.moderationDetailLabel}>Причина отказа</span>
                          <span className={styles.moderationDetailValue}>{req.rejectionReason}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.moderationActions}>
                      <button
                        onClick={() => handleApprove(req.id, "role")}
                        disabled={processing === req.id}
                        className={styles.approveBtn}
                        type="button"
                      >
                        <CheckCircle2 size={14} />
                        {processing === req.id ? "Обработка..." : "Принять"}
                      </button>
                      <button
                        onClick={() => handleReject(req.id, "role")}
                        disabled={processing === req.id}
                        className={styles.rejectBtn}
                        type="button"
                      >
                        <XCircle size={14} />
                        {processing === req.id ? "Обработка..." : "Отклонить"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

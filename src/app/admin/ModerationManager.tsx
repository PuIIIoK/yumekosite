"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { API_URL } from "@/config/hosts";

import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FilePenLine,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
  X,
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

interface AnimeEditRequest {
  id: number;
  animeId: number;
  animeTitle: string;
  requestedBy: string;
  payload: string;
  status: string;
  reviewerUsername: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface StudioEditRequest {
  id: number;
  studioId: number;
  studioName: string;
  requestedBy: string;
  payload: string;
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
  const [editRequests, setEditRequests] = useState<AnimeEditRequest[]>([]);
  const [studioEditRequests, setStudioEditRequests] = useState<StudioEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"studios" | "roles" | "edits" | "studioEdits">("studios");

  // Studio detail modal
  const [selectedStudio, setSelectedStudio] = useState<CollaborationRequest | null>(null);

  // Anime edit detail modal
  const [selectedEdit, setSelectedEdit] = useState<AnimeEditRequest | null>(null);

  // Studio edit detail modal
  const [selectedStudioEdit, setSelectedStudioEdit] = useState<StudioEditRequest | null>(null);

  // Reject reason modal state
  const [rejectTarget, setRejectTarget] = useState<{ id: number; type: "studio" | "role" | "edit" | "studioEdit" } | null>(null);

  const [rejectReason, setRejectReason] = useState("");


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

      const editRes = await fetch(`${API_URL}/api/anime-edit-requests`);
      if (editRes.ok) {
        const editData = await editRes.json();
        setEditRequests(editData);
      }

      const studioEditRes = await fetch(`${API_URL}/api/studio-edit-requests`);
      if (studioEditRes.ok) {
        const studioEditData = await studioEditRes.json();
        setStudioEditRequests(studioEditData);
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

  // Lock page scroll while any modal is open.
  useEffect(() => {
    const anyModalOpen =
      selectedStudio !== null ||
      selectedEdit !== null ||
      selectedStudioEdit !== null ||
      rejectTarget !== null;
    if (anyModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedStudio, selectedEdit, selectedStudioEdit, rejectTarget]);


  const endpointFor = (type: "studio" | "role" | "edit" | "studioEdit") =>
    type === "studio"
      ? "collaboration-requests"
      : type === "role"
        ? "studio-role-requests"
        : type === "edit"
          ? "anime-edit-requests"
          : "studio-edit-requests";

  const handleApprove = async (id: number, type: "studio" | "role" | "edit" | "studioEdit") => {
    if (!user) return;
    setProcessing(id);

    try {
      const res = await fetch(`${API_URL}/api/${endpointFor(type)}/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUsername: user.username }),
      });

      if (res.ok) {
        setSelectedStudio(null);
        setSelectedEdit(null);
        setSelectedStudioEdit(null);
        await fetchAllRequests();
      }
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setProcessing(null);
    }
  };

  const openRejectModal = (id: number, type: "studio" | "role" | "edit" | "studioEdit") => {
    setRejectReason("");
    setRejectTarget({ id, type });
  };

  const confirmReject = async () => {
    if (!user || !rejectTarget) return;
    const { id, type } = rejectTarget;
    setProcessing(id);
    try {
      const res = await fetch(`${API_URL}/api/${endpointFor(type)}/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUsername: user.username, reason: rejectReason.trim() }),
      });

      if (res.ok) {
        setRejectTarget(null);
        setSelectedStudio(null);
        setSelectedEdit(null);
        setSelectedStudioEdit(null);
        await fetchAllRequests();
      }
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
  const animeEditRequests = useMemo(
    () => [...editRequests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [editRequests],
  );
  const studioInfoEditRequests = useMemo(
    () => [...studioEditRequests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [studioEditRequests],
  );

  const pendingStudioCount = studioRequests.length;
  const pendingRoleCount = studioRoleRequests.length;
  const pendingEditCount = animeEditRequests.length;
  const pendingStudioEditCount = studioInfoEditRequests.length;
  const totalCount =
    pendingStudioCount + pendingRoleCount + pendingEditCount + pendingStudioEditCount;



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
            <button
              className={`${styles.moderationTab} ${activeTab === "edits" ? styles.active : ""}`}
              onClick={() => setActiveTab("edits")}
              type="button"
            >
              <FilePenLine size={14} />
              Правки аниме
              <span>{pendingEditCount}</span>
            </button>
            <button
              className={`${styles.moderationTab} ${activeTab === "studioEdits" ? styles.active : ""}`}
              onClick={() => setActiveTab("studioEdits")}
              type="button"
            >
              <Building2 size={14} />
              Правки студий
              <span>{pendingStudioEditCount}</span>
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
          <div className={styles.moderationStatCard}>
            <span className={styles.moderationStatLabel}>Правки</span>
            <strong className={styles.moderationStatValue}>{pendingEditCount}</strong>
          </div>
          <div className={styles.moderationStatCard}>
            <span className={styles.moderationStatLabel}>Правки студий</span>
            <strong className={styles.moderationStatValue}>{pendingStudioEditCount}</strong>
          </div>
        </div>
      </section>



      {activeTab === "studios" && (
        <div className={styles.moderationSection}>
          <div className={styles.moderationSectionHeader}>
            <div>
              <h2 className={styles.moderationSectionTitle}>Запросы на студии</h2>
              <p className={styles.moderationSectionSubtitle}>
                Нажмите на карточку, чтобы посмотреть подробности и принять решение.
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
            <div className={styles.studioMiniGrid}>
              {studioRequests.map((req) => (
                <button
                  key={req.id}
                  type="button"
                  className={styles.studioMiniCard}
                  onClick={() => setSelectedStudio(req)}
                >
                  <div
                    className={styles.studioMiniBanner}
                    style={req.banner ? { backgroundImage: `url(${req.banner})` } : undefined}
                  >
                    <div className={styles.studioMiniOverlay} />
                    <span className={`${styles.moderationStatus} ${styles.moderationStatusPending}`}>
                      <ShieldAlert size={12} />
                      {formatStatus(req.status)}
                    </span>
                  </div>
                  <div className={styles.studioMiniInfo}>
                    <div className={styles.studioMiniAvatarWrap}>
                      {req.avatar ? (
                        <img src={req.avatar} alt={req.studioName} className={styles.studioMiniAvatar} />
                      ) : (
                        <div className={styles.studioMiniAvatarFallback}>
                          {req.studioName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={styles.studioMiniText}>
                      <h3>{req.studioName}</h3>
                      <p>{req.animeName}</p>
                    </div>
                  </div>
                </button>
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
                        onClick={() => openRejectModal(req.id, "role")}
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

      {activeTab === "edits" && (
        <div className={styles.moderationSection}>
          <div className={styles.moderationSectionHeader}>
            <div>
              <h2 className={styles.moderationSectionTitle}>Правки аниме</h2>
              <p className={styles.moderationSectionSubtitle}>
                Изменения тайтлов от релизёров. Нажмите на карточку, чтобы
                посмотреть предложенные поля и принять решение.
              </p>
            </div>
            <div className={styles.moderationSectionPill}>
              <Clock3 size={14} />
              {pendingEditCount} на рассмотрении
            </div>
          </div>

          {animeEditRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <ShieldCheck size={22} />
              <div>
                <strong>Нет правок аниме</strong>
                <span>Предложения релизёров появятся здесь автоматически.</span>
              </div>
            </div>
          ) : (
            <div className={styles.moderationGrid}>
              {animeEditRequests.map((req) => (
                <article key={req.id} className={styles.moderationCard}>
                  <div className={styles.moderationCardBody}>
                    <div className={styles.moderationHeader}>
                      <div className={styles.moderationHeaderText}>
                        <span className={styles.roleBadge}>Правка</span>
                        <h3>{req.animeTitle}</h3>
                        <p>@{req.requestedBy}</p>
                      </div>
                      <span className={styles.moderationMetaBadge}>ID #{req.id}</span>
                    </div>

                    <div className={styles.moderationDetails}>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Аниме</span>
                        <span className={styles.moderationDetailValue}>#{req.animeId}</span>
                      </div>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Создано</span>
                        <span className={styles.moderationDetailValue}>{formatDate(req.createdAt)}</span>
                      </div>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Статус</span>
                        <span className={styles.moderationDetailValue}>{formatStatus(req.status)}</span>
                      </div>
                    </div>

                    <div className={styles.moderationActions}>
                      <button
                        onClick={() => setSelectedEdit(req)}
                        className={styles.approveBtn}
                        type="button"
                      >
                        <FilePenLine size={14} />
                        Посмотреть правки
                      </button>
                      <button
                        onClick={() => openRejectModal(req.id, "edit")}
                        disabled={processing === req.id}
                        className={styles.rejectBtn}
                        type="button"
                      >
                        <XCircle size={14} />
                        Отклонить
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "studioEdits" && (
        <div className={styles.moderationSection}>
          <div className={styles.moderationSectionHeader}>
            <div>
              <h2 className={styles.moderationSectionTitle}>Правки студий</h2>
              <p className={styles.moderationSectionSubtitle}>
                Изменения информации о студии от их владельцев. Название, описание,
                обложка, баннер и соцсети требуют модерации.
              </p>
            </div>
            <div className={styles.moderationSectionPill}>
              <Clock3 size={14} />
              {pendingStudioEditCount} на рассмотрении
            </div>
          </div>

          {studioInfoEditRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <ShieldCheck size={22} />
              <div>
                <strong>Нет правок студий</strong>
                <span>Предложения владельцев студий появятся здесь автоматически.</span>
              </div>
            </div>
          ) : (
            <div className={styles.moderationGrid}>
              {studioInfoEditRequests.map((req) => (
                <article key={req.id} className={styles.moderationCard}>
                  <div className={styles.moderationCardBody}>
                    <div className={styles.moderationHeader}>
                      <div className={styles.moderationHeaderText}>
                        <span className={styles.roleBadge}>Правка студии</span>
                        <h3>{req.studioName}</h3>
                        <p>@{req.requestedBy}</p>
                      </div>
                      <span className={styles.moderationMetaBadge}>ID #{req.id}</span>
                    </div>

                    <div className={styles.moderationDetails}>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Студия</span>
                        <span className={styles.moderationDetailValue}>#{req.studioId}</span>
                      </div>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Создано</span>
                        <span className={styles.moderationDetailValue}>{formatDate(req.createdAt)}</span>
                      </div>
                      <div className={styles.moderationDetailRow}>
                        <span className={styles.moderationDetailLabel}>Статус</span>
                        <span className={styles.moderationDetailValue}>{formatStatus(req.status)}</span>
                      </div>
                    </div>

                    <div className={styles.moderationActions}>
                      <button
                        onClick={() => setSelectedStudioEdit(req)}
                        className={styles.approveBtn}
                        type="button"
                      >
                        <FilePenLine size={14} />
                        Посмотреть правки
                      </button>
                      <button
                        onClick={() => openRejectModal(req.id, "studioEdit")}
                        disabled={processing === req.id}
                        className={styles.rejectBtn}
                        type="button"
                      >
                        <XCircle size={14} />
                        Отклонить
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedStudio && (
        <StudioDetailModal
          req={selectedStudio}
          processing={processing === selectedStudio.id}
          onClose={() => setSelectedStudio(null)}
          onApprove={() => handleApprove(selectedStudio.id, "studio")}
          onReject={() => openRejectModal(selectedStudio.id, "studio")}
        />
      )}


      {selectedEdit && (
        <AnimeEditDetailModal
          req={selectedEdit}
          processing={processing === selectedEdit.id}
          onClose={() => setSelectedEdit(null)}
          onApprove={() => handleApprove(selectedEdit.id, "edit")}
          onReject={() => openRejectModal(selectedEdit.id, "edit")}
        />
      )}

      {selectedStudioEdit && (
        <StudioEditDetailModal
          req={selectedStudioEdit}
          processing={processing === selectedStudioEdit.id}
          onClose={() => setSelectedStudioEdit(null)}
          onApprove={() => handleApprove(selectedStudioEdit.id, "studioEdit")}
          onReject={() => openRejectModal(selectedStudioEdit.id, "studioEdit")}
        />
      )}


      {rejectTarget && (

        <RejectReasonModal
          reason={rejectReason}
          setReason={setRejectReason}
          processing={processing === rejectTarget.id}
          onClose={() => setRejectTarget(null)}
          onConfirm={confirmReject}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Studio detail modal
// ─────────────────────────────────────────────────────────────
function StudioDetailModal({
  req,
  processing,
  onClose,
  onApprove,
  onReject,
}: {
  req: CollaborationRequest;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className={styles.studioModal} onMouseDown={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={onClose} type="button" aria-label="Закрыть">
          <X size={18} />
        </button>

        <div
          className={styles.studioModalBanner}
          style={req.banner ? { backgroundImage: `url(${req.banner})` } : undefined}
        >
          <div className={styles.studioModalBannerOverlay} />
          <div className={styles.studioModalHeaderRow}>
            <div className={styles.studioModalAvatarWrap}>
              {req.avatar ? (
                <img src={req.avatar} alt={req.studioName} className={styles.studioModalAvatar} />
              ) : (
                <div className={styles.studioModalAvatarFallback}>
                  {req.studioName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.studioModalTitle}>
              <h3>{req.studioName}</h3>
              <p>{req.animeName}</p>
            </div>
          </div>
        </div>

        <div className={styles.studioModalBody}>
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
            <div className={styles.moderationDetailRow}>
              <span className={styles.moderationDetailLabel}>ID заявки</span>
              <span className={styles.moderationDetailValue}>#{req.id}</span>
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
          </div>

          <div className={styles.moderationActions}>
            <button onClick={onApprove} disabled={processing} className={styles.approveBtn} type="button">
              <CheckCircle2 size={14} />
              {processing ? "Обработка..." : "Принять студию"}
            </button>
            <button onClick={onReject} disabled={processing} className={styles.rejectBtn} type="button">
              <XCircle size={14} />
              Отклонить
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ─────────────────────────────────────────────────────────────
// Anime edit detail modal
// ─────────────────────────────────────────────────────────────
// Fields shown in the diff. Order matters. Excludes meta, synopsis, badges,
// relatedIds and hiddenStudio per moderation UX.
const EDIT_FIELD_LABELS: Record<string, string> = {
  title: "Название",
  altTitle: "Альт. название",
  studio: "Студия",
  rating: "Рейтинг",
  genres: "Жанры",
  poster: "Постер",
  description: "Описание",
  season: "Сезон",
  year: "Год",
  format: "Формат",
  episodes: "Эпизоды",
  duration: "Длительность",
  status: "Статус",
  isHidden: "Скрыто",
};

const EDIT_FIELD_ORDER = Object.keys(EDIT_FIELD_LABELS);

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).trim();
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  const str = String(value).trim();
  return str === "" ? "—" : str;
}

function AnimeEditDetailModal({
  req,
  processing,
  onClose,
  onApprove,
  onReject,
}: {
  req: AnimeEditRequest;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [current, setCurrent] = useState<Record<string, unknown> | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  let fields: Record<string, unknown> = {};
  try {
    fields = JSON.parse(req.payload) as Record<string, unknown>;
  } catch {
    fields = {};
  }

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/anime/${req.animeId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) {
          setCurrent(data);
          setLoadingCurrent(false);
        }
      })
      .catch(() => {
        if (active) setLoadingCurrent(false);
      });
    return () => {
      active = false;
    };
  }, [req.animeId]);

  const posterUrl = typeof fields.poster === "string" ? fields.poster : null;

  // Build the list of *changed* fields (proposed differs from current), keeping
  // only the whitelisted keys and preserving a sensible order.
  const changes = EDIT_FIELD_ORDER.filter((key) => key in fields).map((key) => {
    const proposed = fields[key];
    const existing = current ? current[key] : undefined;
    const changed =
      current !== null && normalizeValue(proposed) !== normalizeValue(existing);
    return { key, proposed, existing, changed };
  });

  const changedOnly = current ? changes.filter((c) => c.changed) : changes;

  return (
    <Overlay onClose={onClose}>
      <div
        className={`${styles.studioModal} ${styles.editModal}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className={styles.modalCloseBtn} onClick={onClose} type="button" aria-label="Закрыть">
          <X size={18} />
        </button>

        <div className={styles.studioModalBanner}>
          <div className={styles.studioModalBannerOverlay} />
          <div className={styles.studioModalHeaderRow}>
            <div className={styles.studioModalAvatarWrap}>
              {posterUrl ? (
                <img src={posterUrl} alt={req.animeTitle} className={styles.studioModalAvatar} />
              ) : (
                <div className={styles.studioModalAvatarFallback}>
                  {req.animeTitle.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.studioModalTitle}>
              <span className={styles.editModalTag}>
                <FilePenLine size={12} /> Правка тайтла
              </span>
              <h3>{req.animeTitle}</h3>
              <p>
                от @{req.requestedBy} · #{req.animeId} · {formatDate(req.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.studioModalBody}>
          <div className={styles.editDiffHead}>
            <span className={styles.editDiffTitle}>
              Предложенные изменения
              {current && (
                <span className={styles.editDiffCount}>{changedOnly.length}</span>
              )}
            </span>
            {current && (
              <span className={styles.editDiffLegend}>было → стало</span>
            )}
          </div>

          {loadingCurrent ? (
            <div className={styles.editDiffEmpty}>Загрузка текущих данных...</div>
          ) : changedOnly.length === 0 ? (
            <div className={styles.editDiffEmpty}>
              <ShieldCheck size={20} />
              <span>Изменений в отслеживаемых полях нет.</span>
            </div>
          ) : (
            <div className={styles.editDiffList}>
              {changedOnly.map(({ key, proposed, existing }) => {
                const isPoster = key === "poster";
                return (
                  <div className={styles.editDiffRow} key={key}>
                    <span className={styles.editDiffLabel}>
                      {EDIT_FIELD_LABELS[key] || key}
                    </span>
                    {isPoster ? (
                      <div className={styles.editDiffPosters}>
                        {current && existing ? (
                          <div className={styles.editDiffPosterCol}>
                            <span className={styles.editDiffOldTag}>Было</span>
                            <img src={String(existing)} alt="старый постер" />
                          </div>
                        ) : null}
                        {proposed ? (
                          <div className={styles.editDiffPosterCol}>
                            <span className={styles.editDiffNewTag}>Стало</span>
                            <img src={String(proposed)} alt="новый постер" />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className={styles.editDiffValues}>
                        {current && (
                          <span className={styles.editDiffOld}>
                            {displayValue(existing)}
                          </span>
                        )}
                        {current && <span className={styles.editDiffArrow}>→</span>}
                        <span className={styles.editDiffNew}>
                          {displayValue(proposed)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.moderationActions}>
            <button onClick={onApprove} disabled={processing} className={styles.approveBtn} type="button">
              <CheckCircle2 size={14} />
              {processing ? "Обработка..." : "Принять правки"}
            </button>
            <button onClick={onReject} disabled={processing} className={styles.rejectBtn} type="button">
              <XCircle size={14} />
              Отклонить
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}


// ─────────────────────────────────────────────────────────────
// Studio edit detail modal
// ─────────────────────────────────────────────────────────────
const STUDIO_EDIT_FIELD_LABELS: Record<string, string> = {
  name: "Название",
  description: "Описание",
  avatar: "Аватар",
  banner: "Баннер",
  socials: "Соцсети",
  website: "Сайт",
  contact: "Контакт",
};

const STUDIO_EDIT_FIELD_ORDER = Object.keys(STUDIO_EDIT_FIELD_LABELS);
const STUDIO_IMAGE_FIELDS = new Set(["avatar", "banner"]);

function StudioEditDetailModal({
  req,
  processing,
  onClose,
  onApprove,
  onReject,
}: {
  req: StudioEditRequest;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [current, setCurrent] = useState<Record<string, unknown> | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  let fields: Record<string, unknown> = {};
  try {
    fields = JSON.parse(req.payload) as Record<string, unknown>;
  } catch {
    fields = {};
  }

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/studios/${req.studioId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) {
          setCurrent(data);
          setLoadingCurrent(false);
        }
      })
      .catch(() => {
        if (active) setLoadingCurrent(false);
      });
    return () => {
      active = false;
    };
  }, [req.studioId]);

  const avatarUrl = typeof fields.avatar === "string" ? fields.avatar : null;

  const changes = STUDIO_EDIT_FIELD_ORDER.filter((key) => key in fields).map((key) => {
    const proposed = fields[key];
    const existing = current ? current[key] : undefined;
    const changed =
      current !== null && normalizeValue(proposed) !== normalizeValue(existing);
    return { key, proposed, existing, changed };
  });

  const changedOnly = current ? changes.filter((c) => c.changed) : changes;

  return (
    <Overlay onClose={onClose}>
      <div
        className={`${styles.studioModal} ${styles.editModal}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className={styles.modalCloseBtn} onClick={onClose} type="button" aria-label="Закрыть">
          <X size={18} />
        </button>

        <div className={styles.studioModalBanner}>
          <div className={styles.studioModalBannerOverlay} />
          <div className={styles.studioModalHeaderRow}>
            <div className={styles.studioModalAvatarWrap}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={req.studioName} className={styles.studioModalAvatar} />
              ) : (
                <div className={styles.studioModalAvatarFallback}>
                  {req.studioName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.studioModalTitle}>
              <span className={styles.editModalTag}>
                <FilePenLine size={12} /> Правка студии
              </span>
              <h3>{req.studioName}</h3>
              <p>
                от @{req.requestedBy} · #{req.studioId} · {formatDate(req.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.studioModalBody}>
          <div className={styles.editDiffHead}>
            <span className={styles.editDiffTitle}>
              Предложенные изменения
              {current && (
                <span className={styles.editDiffCount}>{changedOnly.length}</span>
              )}
            </span>
            {current && <span className={styles.editDiffLegend}>было → стало</span>}
          </div>

          {loadingCurrent ? (
            <div className={styles.editDiffEmpty}>Загрузка текущих данных...</div>
          ) : changedOnly.length === 0 ? (
            <div className={styles.editDiffEmpty}>
              <ShieldCheck size={20} />
              <span>Изменений в отслеживаемых полях нет.</span>
            </div>
          ) : (
            <div className={styles.editDiffList}>
              {changedOnly.map(({ key, proposed, existing }) => {
                const isImage = STUDIO_IMAGE_FIELDS.has(key);
                return (
                  <div className={styles.editDiffRow} key={key}>
                    <span className={styles.editDiffLabel}>
                      {STUDIO_EDIT_FIELD_LABELS[key] || key}
                    </span>
                    {isImage ? (
                      <div className={styles.editDiffPosters}>
                        {current && existing ? (
                          <div className={styles.editDiffPosterCol}>
                            <span className={styles.editDiffOldTag}>Было</span>
                            <img src={String(existing)} alt="старое изображение" />
                          </div>
                        ) : null}
                        {proposed ? (
                          <div className={styles.editDiffPosterCol}>
                            <span className={styles.editDiffNewTag}>Стало</span>
                            <img src={String(proposed)} alt="новое изображение" />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className={styles.editDiffValues}>
                        {current && (
                          <span className={styles.editDiffOld}>{displayValue(existing)}</span>
                        )}
                        {current && <span className={styles.editDiffArrow}>→</span>}
                        <span className={styles.editDiffNew}>{displayValue(proposed)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.moderationActions}>
            <button onClick={onApprove} disabled={processing} className={styles.approveBtn} type="button">
              <CheckCircle2 size={14} />
              {processing ? "Обработка..." : "Принять правки"}
            </button>
            <button onClick={onReject} disabled={processing} className={styles.rejectBtn} type="button">
              <XCircle size={14} />
              Отклонить
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}


// ─────────────────────────────────────────────────────────────
// Reject reason modal
// ─────────────────────────────────────────────────────────────
function RejectReasonModal({


  reason,
  setReason,
  processing,
  onClose,
  onConfirm,
}: {
  reason: string;
  setReason: (v: string) => void;
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className={styles.rejectModal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.rejectModalHeader}>
          <XCircle size={18} />
          <h3>Причина отказа</h3>
          <button className={styles.modalCloseBtn} onClick={onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <p className={styles.rejectModalHint}>
          Укажите причину — она будет отправлена пользователю в уведомлении.
        </p>
        <textarea
          className={styles.rejectModalTextarea}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: некорректный баннер студии, недостаточно информации..."
          rows={4}
          autoFocus
        />
        <div className={styles.rejectModalActions}>
          <button className={styles.rejectModalCancel} onClick={onClose} type="button" disabled={processing}>
            Отмена
          </button>
          <button
            className={styles.rejectModalConfirm}
            onClick={onConfirm}
            type="button"
            disabled={processing || !reason.trim()}
          >
            {processing ? "Отправка..." : "Отклонить"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─────────────────────────────────────────────────────────────
// Overlay: closes only on a genuine click (not a drag) on the backdrop
// ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const downOnBackdrop = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const overlay = (
    <div
      className={styles.modalOverlay}
      onMouseDown={(e) => {
        // Only treat as a potential close if the press started on the backdrop itself.
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) {
          onClose();
        }
        downOnBackdrop.current = false;
      }}
    >
      {children}
    </div>
  );

  // Render into document.body via a portal so the fixed overlay is centered
  // against the viewport, not against a transformed admin container.
  if (!mounted) return null;
  return createPortal(overlay, document.body);
}


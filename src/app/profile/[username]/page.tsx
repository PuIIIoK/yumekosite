"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Crown, Star, Shield, ShieldCheck, BadgeCheck, UserPlus, UserCheck, UserX, Clock, X, Users, Bookmark } from "lucide-react";
import { useAuth, type User, type Role } from "@/context/AuthContext";
import { useAppearance, type CanvasStyle } from "@/context/AppearanceContext";
import Header from "@/components/Header/Header";
import ProtectedImage from "@/components/ProtectedImage/ProtectedImage";
import styles from "./profile.module.scss";
import { API_URL } from "@/config/hosts";
import type { AnimeDetails } from "@/data/anime";
import { getAccent } from "@/data/anime";

const STATUS_LABELS: Record<string, string> = {
  watching: "Смотрю",
  planned: "В планах",
  completed: "Просмотрено",
  onhold: "Отложено",
  dropped: "Брошено",
  favorites: "Избранное",
};

function formatActivityStatus(status: string | null): string {
  if (!status) return "";
  return STATUS_LABELS[status] ?? status;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function mapProfileUser(dto: any): User {
  return {
    id: dto.id,
    username: dto.username,
    handle: `@${dto.username}`,
    displayName: dto.displayName,
    bio: dto.bio,
    hasAvatar: dto.hasAvatar ?? false,
    hasBanner: dto.hasBanner ?? false,
    role: dto.role || { id: 0, name: "USER", displayName: "User", color: "#6b7280", priority: 0 },
    roles: dto.roles || [dto.role || { id: 0, name: "USER", displayName: "User", color: "#6b7280", priority: 0 }],
    imageVersion: Date.now(),
    effects: {
      effectShimmer: dto.effectShimmer ?? false,
      effectBorderGlow: dto.effectBorderGlow ?? false,
      effectAvatarGlow: dto.effectAvatarGlow ?? false,
      effectVerifiedBadge: dto.effectVerifiedBadge ?? false,
      accentColor: dto.accentColor ?? null,
      profileCanvasStyle: dto.profileCanvasStyle ?? null,
    },
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const appearance = useAppearance();
  const username = (params?.username as string) ?? "";
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [friendCount, setFriendCount] = useState(0);
  const [friendLoading, setFriendLoading] = useState(false);
  const [collectionStats, setCollectionStats] = useState<{ inList: number; completed: number; favorites: number }>({ inList: 0, completed: 0, favorites: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  // Modal state
  type ModalType = null | "collection" | "friends";
  const [modal, setModal] = useState<ModalType>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [bookmarksTab, setBookmarksTab] = useState<string>("favorites");
  const [bmIndicator, setBmIndicator] = useState({ left: 0, width: 0 });
  const bmTabsRef = useRef<HTMLDivElement>(null);
  const [collectionMap, setCollectionMap] = useState<Record<string, number[]>>({});
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [animeCatalog, setAnimeCatalog] = useState<AnimeDetails[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsListLoading, setFriendsListLoading] = useState(false);

  const FRIEND_ROLE_COLORS: Record<string, { c1: string; c2: string }> = {
    ADMIN: { c1: "#a78bfa", c2: "#f472b6" },
    PRE_ADMIN: { c1: "#c084fc", c2: "#a78bfa" },
    ST_MODERATOR: { c1: "#34d399", c2: "#2dd4bf" },
    MODERATOR: { c1: "#38bdf8", c2: "#60a5fa" },
  };

  const getFriendCardStyle = (f: any): React.CSSProperties => {
    const hasEffect = f.effectShimmer || f.effectBorderGlow || f.effectAvatarGlow || f.effectVerifiedBadge;
    if (!hasEffect) return {};
    const rc = f.accentColor
      ? { c1: f.accentColor, c2: f.accentColor }
      : FRIEND_ROLE_COLORS[f.role?.name] || null;
    if (!rc) return {};
    return { "--fc-c1": rc.c1, "--fc-c2": rc.c2 } as React.CSSProperties;
  };

  const closeModal = () => {
    if (modalClosing) return;
    setModalClosing(true);
    setTimeout(() => { setModal(null); setModalClosing(false); }, 350);
  };

  useEffect(() => {
    if (!bmTabsRef.current) return;
    const active = bmTabsRef.current.querySelector("[data-active='true']") as HTMLElement | null;
    if (active) setBmIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [bookmarksTab, modal]);

  useEffect(() => {
    fetch(`${API_URL}/api/anime`).then(r => r.json()).then((d: AnimeDetails[]) => setAnimeCatalog(d)).catch(() => {});
  }, []);

  const openCollectionModal = useCallback(async (tab = "favorites") => {
    setModal("collection");
    setBookmarksTab(tab);
    if (Object.keys(collectionMap).length > 0) return;
    setCollectionsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/collections/${username.toLowerCase()}`);
      if (res.ok) {
        const items: { animeId: number; status: string }[] = await res.json();
        const map: Record<string, number[]> = {};
        for (const item of items) {
          if (!map[item.status]) map[item.status] = [];
          map[item.status].push(item.animeId);
        }
        setCollectionMap(map);
      }
    } catch {}
    setCollectionsLoading(false);
  }, [username, collectionMap]);

  const openFriendsModal = useCallback(async () => {
    setModal("friends");
    if (friendsList.length > 0) return;
    setFriendsListLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/friends/list/${username.toLowerCase()}`);
      const data = parseHex(await res.text());
      if (data.ok) setFriendsList(data.friends);
    } catch {}
    setFriendsListLoading(false);
  }, [username, friendsList.length]);

  function parseHex(hexDump: string): any {
    const bytes: number[] = [];
    for (const line of hexDump.split("\n")) {
      if (!line.trim()) continue;
      const hexPart = line.substring(10, 58).trim();
      for (const h of hexPart.split(/\s+/)) {
        if (h.length === 2) bytes.push(parseInt(h, 16));
      }
    }
    return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
  }

  useEffect(() => {
    async function fetchCollectionStats() {
      try {
        const res = await fetch(`${API_URL}/api/collections/${username.toLowerCase()}`);
        if (res.ok) {
          const items: { animeId: number; status: string }[] = await res.json();
          const favCount = items.filter(i => i.status === "favorites").length;
          const compCount = items.filter(i => i.status === "completed").length;
          const listCount = new Set(items.filter(i => i.status !== "favorites").map(i => i.animeId)).size;
          setCollectionStats({ inList: listCount, completed: compCount, favorites: favCount });
        }
      } catch {}
    }
    if (username) fetchCollectionStats();
  }, [username]);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`${API_URL}/api/activity/${username.toLowerCase()}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch {}
    }
    if (username) fetchActivity();
  }, [username]);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`${API_URL}/api/profile/${username.toLowerCase()}`);
        const hexDump = await res.text();
        const bytes: number[] = [];
        for (const line of hexDump.split("\n")) {
          if (!line.trim()) continue;
          const hexPart = line.substring(10, 58).trim();
          for (const h of hexPart.split(/\s+/)) {
            if (h.length === 2) bytes.push(parseInt(h, 16));
          }
        }
        const jsonStr = new TextDecoder().decode(new Uint8Array(bytes));
        const data = JSON.parse(jsonStr);
        if (data.ok && data.user) {
          setProfileUser(mapProfileUser(data.user));
          if (data.user.createdAt) setCreatedAt(data.user.createdAt);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    if (username) fetchProfile();
  }, [username]);

  useEffect(() => {
    if (!profileUser) return;
    const profileCanvas = profileUser.effects?.profileCanvasStyle;
    const profileAccent = profileUser.effects?.accentColor;
    if (profileCanvas) {
      appearance.setCanvasStyleOverride(profileCanvas as CanvasStyle);
    }
    if (profileAccent) {
      appearance.setCanvasAccentOverride(profileAccent);
    }
    return () => {
      appearance.setCanvasStyleOverride(null);
      appearance.setCanvasAccentOverride(null);
    };
  }, [profileUser]);

  useEffect(() => {
    if (!username) return;
    fetch(`${API_URL}/api/friends/count/${username.toLowerCase()}`)
      .then(r => r.text()).then(t => { const d = parseHex(t); if (d.ok) setFriendCount(d.count); }).catch(() => {});
  }, [username]);

  useEffect(() => {
    if (!username || !auth.user || auth.user.username.toLowerCase() === username.toLowerCase()) return;
    fetch(`${API_URL}/api/friends/status/${username.toLowerCase()}?from=${auth.user.username}`)
      .then(r => r.text()).then(t => { const d = parseHex(t); if (d.ok) setFriendStatus(d.status); }).catch(() => {});
  }, [username, auth.user]);

  const handleFriendAction = async () => {
    if (!auth.user || friendLoading) return;
    setFriendLoading(true);
    try {
      if (friendStatus === "none") {
        const res = await fetch(`${API_URL}/api/friends/request/${username.toLowerCase()}?from=${auth.user.username}`, { method: "POST" });
        const d = parseHex(await res.text());
        if (d.ok) { setFriendStatus(d.status === "accepted" ? "friends" : "pending_sent"); if (d.status === "accepted") setFriendCount(c => c + 1); }
      } else if (friendStatus === "pending_received") {
        const res = await fetch(`${API_URL}/api/friends/accept/${username.toLowerCase()}?from=${auth.user.username}`, { method: "POST" });
        const d = parseHex(await res.text());
        if (d.ok) { setFriendStatus("friends"); setFriendCount(c => c + 1); }
      } else if (friendStatus === "pending_sent" || friendStatus === "friends") {
        const res = await fetch(`${API_URL}/api/friends/${username.toLowerCase()}?from=${auth.user.username}`, { method: "DELETE" });
        const d = parseHex(await res.text());
        if (d.ok) { const wasFriend = friendStatus === "friends"; setFriendStatus("none"); if (wasFriend) setFriendCount(c => Math.max(0, c - 1)); }
      }
    } catch {}
    setFriendLoading(false);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.profileWrap}>
          <div className={styles.loader}>Загрузка профиля…</div>
        </main>
      </>
    );
  }

  if (notFound || !profileUser) {
    return (
      <>
        <Header />
        <main className={styles.profileWrap}>
          <div className={styles.loader}>Пользователь не найден</div>
        </main>
      </>
    );
  }

  const isOwner = auth.user?.username.toLowerCase() === username.toLowerCase();

  const nameWords = profileUser.displayName.split(/\s+/);
  const nameFirstLine = nameWords[0];
  const nameRest = nameWords.slice(1).join(" ");

  const ROLE_COLORS: Record<string, { c1: string; c2: string; c3: string }> = {
    ADMIN:        { c1: "#a78bfa", c2: "#f472b6", c3: "#818cf8" },
    PRE_ADMIN:    { c1: "#c084fc", c2: "#a78bfa", c3: "#7c3aed" },
    ST_MODERATOR: { c1: "#34d399", c2: "#2dd4bf", c3: "#06b6d4" },
    MODERATOR:    { c1: "#38bdf8", c2: "#60a5fa", c3: "#818cf8" },
  };

  const roleName = profileUser.role.name;
  const fx = profileUser.effects;
  const hasAnyEffect = fx.effectShimmer || fx.effectBorderGlow || fx.effectAvatarGlow || fx.effectVerifiedBadge;

  // Build role colors: prefer custom accentColor, fallback to role defaults
  const defaultRc = ROLE_COLORS[roleName];
  const rc = fx.accentColor
    ? { c1: fx.accentColor, c2: fx.accentColor, c3: fx.accentColor }
    : defaultRc || null;
  const roleVars = rc
    ? ({ "--role-color-1": rc.c1, "--role-color-2": rc.c2, "--role-color-3": rc.c3 } as React.CSSProperties)
    : {};

  return (
    <>
      <Header />
      <main className={styles.profileWrap}>
        {/* Top meta bar */}
        <section className={styles.metaBar}>
          <div className={styles.metaLeft}>
            <span>USR / 0001</span>
            <span className={styles.metaDivider} />
            <span>PROFILE</span>
            <span className={styles.metaDivider} />
            <span>{profileUser.handle.replace("@", "").toUpperCase()}</span>
          </div>
          <div className={styles.metaRight}>
            <span className={styles.metaStatus}>
              <span className={styles.metaStatusDot} />
              ONLINE
            </span>
            <span className={styles.metaDivider} />
            <span>v1.0.0</span>
          </div>
        </section>

        {/* Hero */}
        <section
          className={`${styles.hero}${hasAnyEffect ? ` ${styles.heroPrivileged}` : ""}`}
          style={roleVars}
        >
          {fx.effectBorderGlow && <div className={styles.heroBorderGlow} />}
          {fx.effectShimmer && <div className={styles.heroShimmer} />}
          {profileUser.hasBanner && <ProtectedImage src={`${API_URL}/api/media/${profileUser.username}/banner?v=${profileUser.imageVersion}`} alt="banner" className={styles.heroBannerImg} />}
          <div className={styles.heroLeft}>
            <span className={styles.heroIndex}>// 01 — IDENTITY</span>
            <h1 className={styles.displayName}>
              {nameFirstLine}
              {nameRest && <span className={styles.displayNameSub}>{nameRest}</span>}
            </h1>
            <div className={styles.heroSubRow}>
              <span className={styles.handle}>{profileUser.handle}</span>
              {fx.effectVerifiedBadge && (
                <span className={styles.verifiedBadge}>
                  <BadgeCheck size={13} strokeWidth={2.5} />
                </span>
              )}
              {(profileUser.roles ?? [profileUser.role]).map((r) => (
                <span key={r.name} className={`${styles.roleBadge}${hasAnyEffect ? ` ${styles.roleBadgeGlow}` : ""}`} style={{ borderColor: r.color, color: r.color }}>
                  {r.name === "ADMIN" && <Crown size={11} strokeWidth={2.5} />}
                  {r.name === "PRE_ADMIN" && <Shield size={11} strokeWidth={2.5} />}
                  {r.name === "ST_MODERATOR" && <ShieldCheck size={11} strokeWidth={2.5} />}
                  {r.name === "MODERATOR" && <Shield size={11} strokeWidth={2.5} />}
                  {r.name === "USER" && <Star size={11} strokeWidth={2.5} />}
                  {r.displayName}
                </span>
              ))}
            </div>
            {!isOwner && auth.isAuthenticated && (
              <button
                className={`${styles.addFriendBtn}${friendStatus === "friends" ? ` ${styles.addFriendBtnActive}` : ""}${friendStatus === "pending_sent" ? ` ${styles.addFriendBtnPending}` : ""}`}
                onClick={handleFriendAction}
                disabled={friendLoading}
              >
                {friendStatus === "none" && <><UserPlus size={15} strokeWidth={2.2} />Добавить в друзья</>}
                {friendStatus === "pending_sent" && <><Clock size={15} strokeWidth={2.2} />Запрос отправлен</>}
                {friendStatus === "pending_received" && <><UserCheck size={15} strokeWidth={2.2} />Принять запрос</>}
                {friendStatus === "friends" && <><UserX size={15} strokeWidth={2.2} />Удалить из друзей</>}
              </button>
            )}
          </div>

          <div className={styles.heroRight}>
            <div className={`${styles.avatarFrame}${fx.effectAvatarGlow ? ` ${styles.avatarFramePrivileged}` : ""}`} style={{ "--profile-accent": fx.accentColor || "var(--accent)", "--avatar-c1": fx.accentColor || "var(--accent)", "--avatar-c2": fx.accentColor || "var(--accent)", "--avatar-c3": fx.accentColor || "var(--accent)" } as React.CSSProperties}>
              {profileUser.hasAvatar ? (
                <ProtectedImage src={`${API_URL}/api/media/${profileUser.username}/avatar?v=${profileUser.imageVersion}`} alt={profileUser.displayName} className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarInitial}>{profileUser.displayName.charAt(0)}</span>
              )}
            </div>
          </div>
        </section>

        {/* Stats — oversized */}
        <section className={styles.statsGrid}>
          <div className={`${styles.statCell} ${styles.statCellClickable}`} onClick={() => openCollectionModal("favorites")}>
            <span className={styles.statIndex}>02 / 01</span>
            <span className={styles.statValue}>{String(collectionStats.inList).padStart(2, "0")}</span>
            <span className={styles.statLabel}>в списке</span>
          </div>
          <div className={`${styles.statCell} ${styles.statCellClickable}`} onClick={() => openCollectionModal("completed")}>
            <span className={styles.statIndex}>02 / 02</span>
            <span className={styles.statValue}>{String(collectionStats.completed).padStart(2, "0")}</span>
            <span className={styles.statLabel}>просмотрено</span>
          </div>
          <div className={`${styles.statCell} ${styles.statCellClickable}`} onClick={() => openCollectionModal("favorites")}>
            <span className={styles.statIndex}>02 / 03</span>
            <span className={styles.statValue}>{String(collectionStats.favorites).padStart(2, "0")}</span>
            <span className={styles.statLabel}>избранное</span>
          </div>
          <div className={`${styles.statCell} ${styles.statCellClickable}`} onClick={() => openFriendsModal()}>
            <span className={styles.statIndex}>02 / 04</span>
            <span className={styles.statValue}>{String(friendCount).padStart(2, "0")}</span>
            <span className={styles.statLabel}>друзья</span>
          </div>
        </section>

        {/* Asymmetric content grid */}
        <section className={styles.contentGrid}>
          <div className={styles.colMain}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIndex}>03 / 01</span>
                <h2 className={styles.sectionTitle}>О себе</h2>
                <span className={styles.sectionLine} />
              </div>
              <p className={styles.bodyText}>
                {profileUser.bio || "Расскажите немного о себе, своих любимых жанрах и тайтлах. Пока этот раздел пустует — самое время заполнить его."}
              </p>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIndex}>03 / 02</span>
                <h2 className={styles.sectionTitle}>Активность</h2>
                <span className={styles.sectionLine} />
              </div>
              {activities.length === 0 ? (
                <p className={styles.emptyText}>no_recent_activity.log</p>
              ) : (
                <div className={styles.activityList}>
                  {activities.map((a) => {
                    const isEpWatch = a.type === "episode_watch";
                    const epThumb = isEpWatch ? a.episodePreview : a.animePoster;
                    const showStudio = isEpWatch && a.episodeStudio && a.episodeStudio !== "YumekoStudio" && a.episodeStudio !== "Yumeko Studio";
                    return (
                      <div key={a.id} className={styles.activityItem}>
                        {isEpWatch ? (
                          <div className={styles.activityEpThumb}>
                            {epThumb ? (
                              <img src={epThumb} alt="" className={styles.activityEpThumbImg} />
                            ) : (
                              <div className={styles.activityEpThumbEmpty} />
                            )}
                          </div>
                        ) : (
                          a.animePoster && <img src={a.animePoster} alt="" className={styles.activityPoster} />
                        )}
                        <div className={styles.activityContent}>
                          <span className={styles.activityText}>
                            {a.type === "collection_add" && <>{formatActivityStatus(a.statusTo)} — <strong>{a.animeTitle}</strong></>}
                            {a.type === "collection_move" && <>Переместил(а) <strong>{a.animeTitle}</strong> из {formatActivityStatus(a.statusFrom)} в {formatActivityStatus(a.statusTo)}</>}
                            {a.type === "collection_remove" && <>Убрал(а) <strong>{a.animeTitle}</strong> из {formatActivityStatus(a.statusFrom)}</>}
                            {a.type === "favorite" && <>Добавил(а) <strong>{a.animeTitle}</strong> в избранное</>}
                            {a.type === "unfavorite" && <>Убрал(а) <strong>{a.animeTitle}</strong> из избранного</>}
                            {isEpWatch && (
                              <>
                                Посмотрел(а) {a.episodeNumber} эпизод{a.episodeTitle ? ` «${a.episodeTitle}»` : ""} — <strong>{a.animeTitle}</strong>
                                {showStudio && <span className={styles.activityStudio}>{a.episodeStudio}</span>}
                              </>
                            )}
                          </span>
                          <span className={styles.activityTime}>{formatTimeAgo(a.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className={styles.colSide}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIndex}>04 / 01</span>
                <h2 className={styles.sectionTitle}>Meta</h2>
              </div>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>На сайте с</span>
                  <span className={styles.infoValue}>
                    {createdAt
                      ? new Date(createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
                      : "—"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Уровень</span>
                  <span className={styles.infoValue}>01</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Роли</span>
                  <span className={styles.infoRoles}>
                    {(profileUser.roles ?? [profileUser.role]).map(r => (
                      <span key={r.name} className={styles.infoRoleTag} style={{ borderColor: r.color, color: r.color }}>
                        {r.displayName}
                      </span>
                    ))}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Бейджи</span>
                  <span className={styles.profileBadges}>
                    {(profileUser.roles ?? [profileUser.role]).map((r) => (
                      <span
                        key={r.name}
                        className={styles.profileBadge}
                        style={{ color: r.color }}
                        title={r.displayName}
                      >
                        {r.name === "ADMIN" && <Crown size={15} strokeWidth={2.4} />}
                        {r.name === "PRE_ADMIN" && <Shield size={15} strokeWidth={2.4} />}
                        {r.name === "ST_MODERATOR" && <ShieldCheck size={15} strokeWidth={2.4} />}
                        {r.name === "MODERATOR" && <Shield size={15} strokeWidth={2.4} />}
                        {r.name === "USER" && <Star size={15} strokeWidth={2.4} />}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer mark */}
        <section className={`${styles.footerMark}${hasAnyEffect ? ` ${styles.footerMarkPrivileged}` : ""}`}>
          <span>
            {hasAnyEffect
              ? `YUMEKO / ${roleName.replace("_", " ")} / ${profileUser.handle.replace("@", "").toUpperCase()}`
              : `YUMEKO / PROFILE / ${profileUser.handle.replace("@", "").toUpperCase()}`}
          </span>
          <span>{hasAnyEffect ? "VERIFIED / PROFILE" : "END / OF / FILE"}</span>
        </section>

      </main>

      {/* Collection Modal */}
      {modal === "collection" && (
        <>
          <div className={styles.searchOverlay} onClick={closeModal} />
          <div className={`${styles.bookmarksModal} ${modalClosing ? styles.bookmarksModalClosing : ""}`}>
            <div className={styles.bookmarksHeader}>
              <div className={styles.bookmarksTabs} ref={bmTabsRef}>
                {[
                  { key: "favorites", label: "Избранное" },
                  { key: "watching", label: "Смотрю" },
                  { key: "planned", label: "В планах" },
                  { key: "completed", label: "Просмотренно" },
                  { key: "onhold", label: "Отложенно" },
                  { key: "dropped", label: "Брошенно" },
                ].map((t) => (
                  <button
                    key={t.key}
                    data-active={bookmarksTab === t.key}
                    className={`${styles.bookmarksTabBtn} ${bookmarksTab === t.key ? styles.bookmarksTabBtnActive : ""}`}
                    onClick={() => setBookmarksTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
                <div className={styles.bmTabIndicator} style={{ left: bmIndicator.left, width: bmIndicator.width }} />
              </div>
              <button className={styles.searchClose} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.bookmarksBody} key={bookmarksTab}>
              {(() => {
                if (collectionsLoading) {
                  return <div className={styles.bookmarksEmpty}><p>Загрузка...</p></div>;
                }
                const ids = collectionMap[bookmarksTab] || [];
                const items = animeCatalog.filter((a) => ids.includes(a.id));
                if (items.length === 0) {
                  return (
                    <div className={styles.bookmarksEmpty}>
                      <Bookmark size={48} strokeWidth={1.2} />
                      <p>Пока пусто</p>
                    </div>
                  );
                }
                return (
                  <div className={styles.bookmarksGrid}>
                    {items.map((item) => (
                      <Link key={item.id} href={`/realeses/anime-page/${item.id}`} className={styles.bookmarkCard} onClick={closeModal}>
                        <div className={styles.bookmarkCardPoster}>
                          <img src={item.poster} alt={item.title} className={styles.bookmarkCardImg} />
                          <div className={styles.bookmarkCardAccent} style={{ background: getAccent(item.rating) }} />
                          <span className={styles.bookmarkCardRating}>{item.rating}</span>
                        </div>
                        <div className={styles.bookmarkCardInfo}>
                          <span className={styles.bookmarkCardTitle}>{item.title}</span>
                          <span className={styles.bookmarkCardMeta}>{item.meta}</span>
                          <span className={styles.bookmarkCardGenres} style={{ color: getAccent(item.rating) }}>{item.genres}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Friends Modal */}
      {modal === "friends" && (
        <>
          <div className={styles.searchOverlay} onClick={closeModal} />
          <div className={`${styles.friendsModal} ${modalClosing ? styles.friendsModalClosing : ""}`}>
            <div className={styles.friendsHeader}>
              <div className={styles.friendsTabs}>
                <button className={`${styles.friendsTabBtn} ${styles.friendsTabBtnActive}`}>
                  Друзья{friendsList.length > 0 && <span className={styles.friendsTabCount}>{friendsList.length}</span>}
                </button>
              </div>
              <button className={styles.searchClose} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.friendsBody}>
              {friendsListLoading ? (
                <div className={styles.friendsEmpty}><p>Загрузка...</p></div>
              ) : friendsList.length === 0 ? (
                <div className={styles.friendsEmpty}>
                  <Users size={48} strokeWidth={1.2} />
                  <p>Список друзей пуст</p>
                </div>
              ) : (
                <div className={styles.friendsGrid}>
                  {friendsList.map((f: any) => {
                    const hasEffect = f.effectShimmer || f.effectBorderGlow || f.effectAvatarGlow || f.effectVerifiedBadge;
                    return (
                      <Link key={f.id} href={`/profile/${f.username}`} onClick={closeModal} className={`${styles.friendCard}${hasEffect ? ` ${styles.friendCardPrivileged}` : ""}`} style={getFriendCardStyle(f)}>
                        <div className={styles.friendCardBanner}>
                          {f.hasBanner ? (
                            <ProtectedImage src={`${API_URL}/api/media/${f.username}/banner`} alt="" className={styles.friendCardBannerImg} />
                          ) : (
                            <div className={styles.friendCardBannerFallback} />
                          )}
                          <div className={styles.friendCardBannerOverlay} />
                          {f.effectShimmer && <div className={styles.friendCardShimmer} />}
                          {f.effectBorderGlow && <div className={styles.friendCardGlow} />}
                        </div>
                        <div className={styles.friendCardBody}>
                          <div className={`${styles.friendAvatar}${f.effectAvatarGlow ? ` ${styles.friendAvatarGlow}` : ""}`}>
                            {f.hasAvatar ? (
                              <ProtectedImage src={`${API_URL}/api/media/${f.username}/avatar`} alt={f.displayName} className={styles.friendAvatarImg} />
                            ) : (
                              <span>{f.displayName.charAt(0)}</span>
                            )}
                          </div>
                          <div className={styles.friendInfo}>
                            <span className={styles.friendName}>{f.displayName}</span>
                            <span className={styles.friendHandle}>@{f.username}</span>
                            <span className={styles.friendRoleBadge} style={{ color: f.role?.color, borderColor: f.role?.color }}>{f.role?.displayName}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

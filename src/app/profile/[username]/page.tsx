"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Crown,
  Star,
  Shield,
  ShieldCheck,
  BadgeCheck,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  X,
  Users,
  Bookmark,
} from "lucide-react";
import { useAuth, type User, type Role } from "@/context/AuthContext";
import { useAppearance, type CanvasStyle } from "@/context/AppearanceContext";
import Header from "@/components/Header/Header";
import ProtectedImage from "@/components/ProtectedImage/ProtectedImage";
import UserStatusIndicator from "@/components/UserStatus/UserStatusIndicator";
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
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Тиры уровней ───────────────────────────────────────────────────────────────────────
// level 1–4: Grey (нет тира)
// level 5–14: Bronze
// level 15–29: Silver
// level 30–49: Gold
// level 50–69: Emerald
// level 70–84: Sapphire
// level 85–99: Amethyst
// level 100:  Legendary
function getLevelTier(level: number): {
  color: string;
  color2: string;
  tier: string;
  label: string;
} {
  if (level >= 100)
    return {
      color: "#f59e0b",
      color2: "#ff4500",
      tier: "legendary",
      label: "LEGENDARY",
    };
  if (level >= 85)
    return {
      color: "#c084fc",
      color2: "#7c3aed",
      tier: "amethyst",
      label: "AMETHYST",
    };
  if (level >= 70)
    return {
      color: "#60a5fa",
      color2: "#1d4ed8",
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
    return { color: "#fbbf24", color2: "#b45309", tier: "gold", label: "GOLD" };
  if (level >= 15)
    return {
      color: "#cbd5e1",
      color2: "#64748b",
      tier: "silver",
      label: "SILVER",
    };
  if (level >= 5)
    return {
      color: "#c97c3a",
      color2: "#7c3d12",
      tier: "bronze",
      label: "BRONZE",
    };
  return {
    color: "#6b7280",
    color2: "#374151",
    tier: "novice",
    label: "NOVICE",
  };
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
    role: dto.role || {
      id: 0,
      name: "USER",
      displayName: "User",
      color: "#6b7280",
      priority: 0,
    },
    roles: dto.roles || [
      dto.role || {
        id: 0,
        name: "USER",
        displayName: "User",
        color: "#6b7280",
        priority: 0,
      },
    ],
    imageVersion: Date.now(),
    hasDiscord: dto.hasDiscord ?? false,
    hasTelegram: dto.hasTelegram ?? false,
    discordUsername: dto.discordUsername ?? null,
    discordId: dto.discordId ?? null,
    telegramUsername: dto.telegramUsername ?? null,
    xp: dto.xp ?? 0,
    level: dto.level ?? 1,
    xpToNextLevel: dto.xpToNextLevel ?? 0,
    xpInCurrentLevel: dto.xpInCurrentLevel ?? 0,
    xpNeededForNextLevel: dto.xpNeededForNextLevel ?? 0,
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
  const [collectionStats, setCollectionStats] = useState<{
    inList: number;
    completed: number;
    favorites: number;
  }>({ inList: 0, completed: 0, favorites: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  // Modal state
  type ModalType = null | "collection" | "friends";
  const [modal, setModal] = useState<ModalType>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [bookmarksTab, setBookmarksTab] = useState<string>("favorites");
  const [bmIndicator, setBmIndicator] = useState({ left: 0, width: 0 });
  const bmTabsRef = useRef<HTMLDivElement>(null);
  const [collectionMap, setCollectionMap] = useState<Record<string, number[]>>(
    {},
  );
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
    const hasEffect =
      f.effectShimmer ||
      f.effectBorderGlow ||
      f.effectAvatarGlow ||
      f.effectVerifiedBadge;
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
    setTimeout(() => {
      setModal(null);
      setModalClosing(false);
    }, 350);
  };

  useEffect(() => {
    if (!bmTabsRef.current) return;
    const active = bmTabsRef.current.querySelector(
      "[data-active='true']",
    ) as HTMLElement | null;
    if (active)
      setBmIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [bookmarksTab, modal]);

  useEffect(() => {
    fetch(`${API_URL}/api/anime`)
      .then((r) => r.json())
      .then((d: AnimeDetails[]) => setAnimeCatalog(d))
      .catch(() => {});
  }, []);

  const openCollectionModal = useCallback(
    async (tab = "favorites") => {
      setModal("collection");
      setBookmarksTab(tab);
      if (Object.keys(collectionMap).length > 0) return;
      setCollectionsLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/collections/${username.toLowerCase()}`,
        );
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
    },
    [username, collectionMap],
  );

  const openFriendsModal = useCallback(async () => {
    setModal("friends");
    if (friendsList.length > 0) return;
    setFriendsListLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/friends/list/${username.toLowerCase()}`,
      );
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
        const res = await fetch(
          `${API_URL}/api/collections/${username.toLowerCase()}`,
        );
        if (res.ok) {
          const items: { animeId: number; status: string }[] = await res.json();
          const favCount = items.filter((i) => i.status === "favorites").length;
          const compCount = items.filter(
            (i) => i.status === "completed",
          ).length;
          const listCount = new Set(
            items.filter((i) => i.status !== "favorites").map((i) => i.animeId),
          ).size;
          setCollectionStats({
            inList: listCount,
            completed: compCount,
            favorites: favCount,
          });
        }
      } catch {}
    }
    if (username) fetchCollectionStats();
  }, [username]);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(
          `${API_URL}/api/activity/${username.toLowerCase()}`,
        );
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
        const res = await fetch(
          `${API_URL}/api/profile/${username.toLowerCase()}`,
        );
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

  // Sync own profile with live auth.user data (settings changes apply instantly)
  useEffect(() => {
    if (!auth.user || !profileUser) return;
    if (auth.user.username.toLowerCase() !== profileUser.username.toLowerCase())
      return;
    setProfileUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        displayName: auth.user!.displayName || prev.displayName,
        bio: auth.user!.bio ?? prev.bio,
        hasAvatar: auth.user!.hasAvatar ?? prev.hasAvatar,
        hasBanner: auth.user!.hasBanner ?? prev.hasBanner,
        // Обновляем уровень и XP — чтобы бейдж обновлялся сразу
        level: auth.user!.level ?? prev.level,
        xp: auth.user!.xp ?? prev.xp,
        xpToNextLevel: auth.user!.xpToNextLevel ?? prev.xpToNextLevel,
        xpInCurrentLevel: auth.user!.xpInCurrentLevel ?? prev.xpInCurrentLevel,
        xpNeededForNextLevel:
          auth.user!.xpNeededForNextLevel ?? prev.xpNeededForNextLevel,
        effects: auth.user!.effects
          ? {
              effectShimmer: auth.user!.effects.effectShimmer,
              effectBorderGlow: auth.user!.effects.effectBorderGlow,
              effectAvatarGlow: auth.user!.effects.effectAvatarGlow,
              effectVerifiedBadge: auth.user!.effects.effectVerifiedBadge,
              accentColor: auth.user!.effects.accentColor,
              profileCanvasStyle: auth.user!.effects.profileCanvasStyle,
            }
          : prev.effects,
      };
    });
  }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!username) return;
    fetch(`${API_URL}/api/friends/count/${username.toLowerCase()}`)
      .then((r) => r.text())
      .then((t) => {
        const d = parseHex(t);
        if (d.ok) setFriendCount(d.count);
      })
      .catch(() => {});
  }, [username]);

  useEffect(() => {
    if (
      !username ||
      !auth.user ||
      auth.user.username.toLowerCase() === username.toLowerCase()
    )
      return;
    fetch(
      `${API_URL}/api/friends/status/${username.toLowerCase()}?from=${auth.user.username}`,
    )
      .then((r) => r.text())
      .then((t) => {
        const d = parseHex(t);
        if (d.ok) setFriendStatus(d.status);
      })
      .catch(() => {});
  }, [username, auth.user]);

  const handleFriendAction = async () => {
    if (!auth.user || friendLoading) return;
    setFriendLoading(true);
    try {
      if (friendStatus === "none") {
        const res = await fetch(
          `${API_URL}/api/friends/request/${username.toLowerCase()}?from=${auth.user.username}`,
          { method: "POST" },
        );
        const d = parseHex(await res.text());
        if (d.ok) {
          setFriendStatus(d.status === "accepted" ? "friends" : "pending_sent");
          if (d.status === "accepted") setFriendCount((c) => c + 1);
        }
      } else if (friendStatus === "pending_received") {
        const res = await fetch(
          `${API_URL}/api/friends/accept/${username.toLowerCase()}?from=${auth.user.username}`,
          { method: "POST" },
        );
        const d = parseHex(await res.text());
        if (d.ok) {
          setFriendStatus("friends");
          setFriendCount((c) => c + 1);
        }
      } else if (
        friendStatus === "pending_sent" ||
        friendStatus === "friends"
      ) {
        const res = await fetch(
          `${API_URL}/api/friends/${username.toLowerCase()}?from=${auth.user.username}`,
          { method: "DELETE" },
        );
        const d = parseHex(await res.text());
        if (d.ok) {
          const wasFriend = friendStatus === "friends";
          setFriendStatus("none");
          if (wasFriend) setFriendCount((c) => Math.max(0, c - 1));
        }
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
    ADMIN: { c1: "#a78bfa", c2: "#f472b6", c3: "#818cf8" },
    PRE_ADMIN: { c1: "#c084fc", c2: "#a78bfa", c3: "#7c3aed" },
    ST_MODERATOR: { c1: "#34d399", c2: "#2dd4bf", c3: "#06b6d4" },
    MODERATOR: { c1: "#38bdf8", c2: "#60a5fa", c3: "#818cf8" },
  };

  const roleName = profileUser.role.name;
  const fx = profileUser.effects;
  const hasAnyEffect =
    fx.effectShimmer ||
    fx.effectBorderGlow ||
    fx.effectAvatarGlow ||
    fx.effectVerifiedBadge;

  // Build role colors: prefer custom accentColor, fallback to role defaults
  const defaultRc = ROLE_COLORS[roleName];
  const rc = fx.accentColor
    ? { c1: fx.accentColor, c2: fx.accentColor, c3: fx.accentColor }
    : defaultRc || null;
  const roleVars = rc
    ? ({
        "--role-color-1": rc.c1,
        "--role-color-2": rc.c2,
        "--role-color-3": rc.c3,
      } as React.CSSProperties)
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
            {profileUser && (
              <UserStatusIndicator
                userId={profileUser.id}
                size="sm"
                showLabel
              />
            )}
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
          {/* Тир-эффект баннера по уровню */}
          {(() => {
            const tier = getLevelTier(profileUser.level ?? 1);
            if (tier.tier === "novice") return null;
            return (
              <div
                className={`${styles.heroTierEffect} ${styles[`heroTierEffect_${tier.tier}`] ?? ""}`}
                style={
                  {
                    "--tier-c": tier.color,
                    "--tier-c2": tier.color2,
                  } as React.CSSProperties
                }
              />
            );
          })()}
          {profileUser.hasBanner && (
            <ProtectedImage
              src={`${API_URL}/api/media/${profileUser.username}/banner?v=${profileUser.imageVersion}`}
              alt="banner"
              className={styles.heroBannerImg}
            />
          )}
          <div className={styles.heroLeft}>
            <span className={styles.heroIndex}>// 01 — IDENTITY</span>
            <h1 className={styles.displayName}>
              {nameFirstLine}
              {nameRest && (
                <span className={styles.displayNameSub}>{nameRest}</span>
              )}
            </h1>
            <UserStatusIndicator userId={profileUser.id} size="sm" showLabel />
            <div className={styles.heroSubRow}>
              <span className={styles.handle}>{profileUser.handle}</span>
              {fx.effectVerifiedBadge && (
                <span className={styles.verifiedBadge}>
                  <BadgeCheck size={13} strokeWidth={2.5} />
                </span>
              )}
              {(profileUser.roles ?? [profileUser.role]).map((r) => (
                <span
                  key={r.name}
                  className={`${styles.roleBadge}${hasAnyEffect ? ` ${styles.roleBadgeGlow}` : ""}`}
                  style={{ borderColor: r.color, color: r.color }}
                >
                  {r.name === "ADMIN" && <Crown size={11} strokeWidth={2.5} />}
                  {r.name === "PRE_ADMIN" && (
                    <Shield size={11} strokeWidth={2.5} />
                  )}
                  {r.name === "ST_MODERATOR" && (
                    <ShieldCheck size={11} strokeWidth={2.5} />
                  )}
                  {r.name === "MODERATOR" && (
                    <Shield size={11} strokeWidth={2.5} />
                  )}
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
                {friendStatus === "none" && (
                  <>
                    <UserPlus size={15} strokeWidth={2.2} />
                    Добавить в друзья
                  </>
                )}
                {friendStatus === "pending_sent" && (
                  <>
                    <Clock size={15} strokeWidth={2.2} />
                    Запрос отправлен
                  </>
                )}
                {friendStatus === "pending_received" && (
                  <>
                    <UserCheck size={15} strokeWidth={2.2} />
                    Принять запрос
                  </>
                )}
                {friendStatus === "friends" && (
                  <>
                    <UserX size={15} strokeWidth={2.2} />
                    Удалить из друзей
                  </>
                )}
              </button>
            )}
          </div>

          <div className={styles.heroRight}>
            <div
              className={`${styles.avatarFrame}${fx.effectAvatarGlow ? ` ${styles.avatarFramePrivileged}` : ""}`}
              style={
                {
                  "--profile-accent": fx.accentColor || "var(--accent)",
                  "--avatar-c1": fx.accentColor || "var(--accent)",
                  "--avatar-c2": fx.accentColor || "var(--accent)",
                  "--avatar-c3": fx.accentColor || "var(--accent)",
                } as React.CSSProperties
              }
            >
              {profileUser.hasAvatar ? (
                <ProtectedImage
                  src={`${API_URL}/api/media/${profileUser.username}/avatar?v=${profileUser.imageVersion}`}
                  alt={profileUser.displayName}
                  className={styles.avatarImg}
                />
              ) : (
                <span className={styles.avatarInitial}>
                  {profileUser.displayName.charAt(0)}
                </span>
              )}
              <UserStatusIndicator
                userId={profileUser.id}
                size="lg"
                showLabel={false}
                dotOnly
              />
            </div>

            {/* Level badge with XP progress */}
            {(() => {
              const lv = profileUser.level ?? 1;
              const xpIn = profileUser.xpInCurrentLevel ?? 0;
              const xpNeed = profileUser.xpNeededForNextLevel ?? 1;
              const pct =
                lv >= 100
                  ? 100
                  : Math.min(100, Math.round((xpIn / xpNeed) * 100));
              const tier = getLevelTier(lv);
              return (
                <div
                  className={`${styles.levelBadge} ${styles[`levelBadgeTier_${tier.tier}`] ?? ""}`}
                  data-tier={tier.tier}
                  style={
                    { "--level-accent": tier.color } as React.CSSProperties
                  }
                  title={
                    lv < 100
                      ? `${xpIn.toLocaleString()} / ${xpNeed.toLocaleString()} XP до ур. ${lv + 1} • ${tier.label}`
                      : "Максимальный уровень!"
                  }
                >
                  <div className={styles.levelBadgeTop}>
                    <span className={styles.levelBadgeSlash}>//</span>
                    <span className={styles.levelBadgeLabel}>LV.</span>
                    <span className={styles.levelBadgeNum}>
                      {String(lv).padStart(2, "0")}
                    </span>
                  </div>
                  <div className={styles.levelBadgeBar}>
                    <div
                      className={styles.levelBadgeBarFill}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Stats — oversized */}
        <section className={styles.statsGrid}>
          <div
            className={`${styles.statCell} ${styles.statCellClickable}`}
            onClick={() => openCollectionModal("favorites")}
          >
            <span className={styles.statIndex}>02 / 01</span>
            <span className={styles.statValue}>
              {String(collectionStats.inList).padStart(2, "0")}
            </span>
            <span className={styles.statLabel}>в списке</span>
          </div>
          <div
            className={`${styles.statCell} ${styles.statCellClickable}`}
            onClick={() => openCollectionModal("completed")}
          >
            <span className={styles.statIndex}>02 / 02</span>
            <span className={styles.statValue}>
              {String(collectionStats.completed).padStart(2, "0")}
            </span>
            <span className={styles.statLabel}>просмотрено</span>
          </div>
          <div
            className={`${styles.statCell} ${styles.statCellClickable}`}
            onClick={() => openCollectionModal("favorites")}
          >
            <span className={styles.statIndex}>02 / 03</span>
            <span className={styles.statValue}>
              {String(collectionStats.favorites).padStart(2, "0")}
            </span>
            <span className={styles.statLabel}>избранное</span>
          </div>
          <div
            className={`${styles.statCell} ${styles.statCellClickable}`}
            onClick={() => openFriendsModal()}
          >
            <span className={styles.statIndex}>02 / 04</span>
            <span className={styles.statValue}>
              {String(friendCount).padStart(2, "0")}
            </span>
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
                {profileUser.bio ||
                  "Расскажите немного о себе, своих любимых жанрах и тайтлах. Пока этот раздел пустует — самое время заполнить его."}
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
                    const isEpUpload = a.type === "episode_upload";
                    const isLevelUp = a.type === "level_up";
                    const epThumb = isEpWatch
                      ? a.episodePreview
                      : a.animePoster;
                    const showStudio =
                      isEpWatch &&
                      a.episodeStudio &&
                      a.episodeStudio !== "YumekoStudio" &&
                      a.episodeStudio !== "Yumeko Studio";
                    return (
                      <div key={a.id} className={styles.activityItem}>
                        {isLevelUp ? (
                          <div
                            className={styles.activityEpThumb}
                            style={{
                              background: `${getLevelTier(a.levelTo ?? 1).color}18`,
                              border: `1px solid ${getLevelTier(a.levelTo ?? 1).color}44`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 8,
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 22,
                                fontFamily: "monospace",
                                fontWeight: 800,
                                color: getLevelTier(a.levelTo ?? 1).color,
                              }}
                            >
                              {String(a.levelTo ?? 1).padStart(2, "0")}
                            </span>
                          </div>
                        ) : isEpWatch ? (
                          <div className={styles.activityEpThumb}>
                            {epThumb ? (
                              <img
                                src={epThumb}
                                alt=""
                                className={styles.activityEpThumbImg}
                              />
                            ) : (
                              <div className={styles.activityEpThumbEmpty} />
                            )}
                          </div>
                        ) : isEpUpload ? (
                          a.animePoster ? (
                            <img
                              src={a.animePoster}
                              alt=""
                              className={styles.activityPoster}
                            />
                          ) : (
                            <div className={styles.activityEpThumb}>
                              <div className={styles.activityEpThumbEmpty} />
                            </div>
                          )
                        ) : (
                          a.animePoster && (
                            <img
                              src={a.animePoster}
                              alt=""
                              className={styles.activityPoster}
                            />
                          )
                        )}
                        <div className={styles.activityContent}>
                          <span className={styles.activityText}>
                            {a.type === "level_up" && (
                              <span
                                style={{
                                  color: getLevelTier(a.levelTo ?? 1).color,
                                  fontWeight: 700,
                                }}
                              >
                                Достиг {a.levelTo} уровня{" "}
                                <span
                                  style={{
                                    opacity: 0.7,
                                    fontSize: 11,
                                    fontFamily: "monospace",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  [{getLevelTier(a.levelTo ?? 1).label}]
                                </span>
                              </span>
                            )}
                            {a.type === "anime_add" && (
                              <>
                                Добавил(а) аниме <strong>{a.animeTitle}</strong>
                              </>
                            )}
                            {a.type === "episode_upload" && (
                              <>
                                Залил(а) {a.episodeNumber} эпизод{" "}
                                {a.episodeStudio &&
                                  a.episodeStudio !== "YumekoStudio" && (
                                    <span className={styles.activityStudio}>
                                      {a.episodeStudio}
                                    </span>
                                  )}{" "}
                                — <strong>{a.animeTitle}</strong>
                              </>
                            )}
                            {a.type === "collection_add" && (
                              <>
                                {formatActivityStatus(a.statusTo)} —{" "}
                                <strong>{a.animeTitle}</strong>
                              </>
                            )}
                            {a.type === "collection_move" && (
                              <>
                                Переместил(а) <strong>{a.animeTitle}</strong> из{" "}
                                {formatActivityStatus(a.statusFrom)} в{" "}
                                {formatActivityStatus(a.statusTo)}
                              </>
                            )}
                            {a.type === "collection_remove" && (
                              <>
                                Убрал(а) <strong>{a.animeTitle}</strong> из{" "}
                                {formatActivityStatus(a.statusFrom)}
                              </>
                            )}
                            {a.type === "favorite" && (
                              <>
                                Добавил(а) <strong>{a.animeTitle}</strong> в
                                избранное
                              </>
                            )}
                            {a.type === "unfavorite" && (
                              <>
                                Убрал(а) <strong>{a.animeTitle}</strong> из
                                избранного
                              </>
                            )}
                            {isEpWatch && (
                              <>
                                Посмотрел(а) {a.episodeNumber} эпизод
                                {a.episodeTitle
                                  ? ` «${a.episodeTitle}»`
                                  : ""} — <strong>{a.animeTitle}</strong>
                                {showStudio && (
                                  <span className={styles.activityStudio}>
                                    {a.episodeStudio}
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                          <span className={styles.activityTime}>
                            {formatTimeAgo(a.createdAt)}
                          </span>
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
                      ? new Date(createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Роли</span>
                  <span className={styles.infoRoles}>
                    {(profileUser.roles ?? [profileUser.role]).map((r) => (
                      <span
                        key={r.name}
                        className={styles.infoRoleTag}
                        style={{ borderColor: r.color, color: r.color }}
                      >
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
                        {r.name === "ADMIN" && (
                          <Crown size={15} strokeWidth={2.4} />
                        )}
                        {r.name === "PRE_ADMIN" && (
                          <Shield size={15} strokeWidth={2.4} />
                        )}
                        {r.name === "ST_MODERATOR" && (
                          <ShieldCheck size={15} strokeWidth={2.4} />
                        )}
                        {r.name === "MODERATOR" && (
                          <Shield size={15} strokeWidth={2.4} />
                        )}
                        {r.name === "USER" && (
                          <Star size={15} strokeWidth={2.4} />
                        )}
                      </span>
                    ))}
                  </span>
                </div>
                {(profileUser.hasDiscord || profileUser.hasTelegram) && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Соц. сети</span>
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        alignItems: "flex-end",
                      }}
                    >
                      {profileUser.hasDiscord && (
                        <a
                          href={
                            profileUser.discordId
                              ? `https://discord.com/users/${profileUser.discordId}`
                              : undefined
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            color: "#7289da",
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: "none",
                            opacity: profileUser.discordId ? 1 : 0.7,
                            cursor: profileUser.discordId
                              ? "pointer"
                              : "default",
                            transition: "opacity 0.15s",
                          }}
                          onMouseOver={(e) => {
                            if (profileUser.discordId)
                              e.currentTarget.style.opacity = "0.75";
                          }}
                          onMouseOut={(e) => {
                            if (profileUser.discordId)
                              e.currentTarget.style.opacity = "1";
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 127.14 96.36"
                            fill="#7289da"
                          >
                            <path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.11 0A72.37 72.37 0 0045.64 0a105.89 105.89 0 00-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0032.17 16.15 77.7 77.7 0 006.89-11.11 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 01-10.87 5.19 77 77 0 006.89 11.1 105.25 105.25 0 0032.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.1 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.1 12.69-11.43 12.69z" />
                          </svg>
                          {profileUser.discordUsername ?? "Discord"}
                        </a>
                      )}
                      {profileUser.hasTelegram && (
                        <a
                          href={
                            profileUser.telegramUsername
                              ? `https://t.me/${profileUser.telegramUsername}`
                              : undefined
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            color: "#229ED9",
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: "none",
                            opacity: profileUser.telegramUsername ? 1 : 0.7,
                            cursor: profileUser.telegramUsername
                              ? "pointer"
                              : "default",
                            transition: "opacity 0.15s",
                          }}
                          onMouseOver={(e) => {
                            if (profileUser.telegramUsername)
                              e.currentTarget.style.opacity = "0.75";
                          }}
                          onMouseOut={(e) => {
                            if (profileUser.telegramUsername)
                              e.currentTarget.style.opacity = "1";
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="#229ED9"
                          >
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
                          </svg>
                          {profileUser.telegramUsername
                            ? `@${profileUser.telegramUsername}`
                            : "Telegram"}
                        </a>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Footer mark */}
        <section
          className={`${styles.footerMark}${hasAnyEffect ? ` ${styles.footerMarkPrivileged}` : ""}`}
        >
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
          <div
            className={`${styles.bookmarksModal} ${modalClosing ? styles.bookmarksModalClosing : ""}`}
          >
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
                <div
                  className={styles.bmTabIndicator}
                  style={{ left: bmIndicator.left, width: bmIndicator.width }}
                />
              </div>
              <button className={styles.searchClose} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.bookmarksBody} key={bookmarksTab}>
              {(() => {
                if (collectionsLoading) {
                  return (
                    <div className={styles.bookmarksEmpty}>
                      <p>Загрузка...</p>
                    </div>
                  );
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
                      <Link
                        key={item.id}
                        href={`/realeses/anime-page/${item.id}`}
                        className={styles.bookmarkCard}
                        onClick={closeModal}
                      >
                        <div className={styles.bookmarkCardPoster}>
                          <img
                            src={item.poster}
                            alt={item.title}
                            className={styles.bookmarkCardImg}
                          />
                          <div
                            className={styles.bookmarkCardAccent}
                            style={{ background: getAccent(item.rating) }}
                          />
                          <span className={styles.bookmarkCardRating}>
                            {item.rating}
                          </span>
                        </div>
                        <div className={styles.bookmarkCardInfo}>
                          <span className={styles.bookmarkCardTitle}>
                            {item.title}
                          </span>
                          <span className={styles.bookmarkCardMeta}>
                            {item.meta}
                          </span>
                          <span
                            className={styles.bookmarkCardGenres}
                            style={{ color: getAccent(item.rating) }}
                          >
                            {item.genres}
                          </span>
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
          <div
            className={`${styles.friendsModal} ${modalClosing ? styles.friendsModalClosing : ""}`}
          >
            <div className={styles.friendsHeader}>
              <div className={styles.friendsTabs}>
                <button
                  className={`${styles.friendsTabBtn} ${styles.friendsTabBtnActive}`}
                >
                  Друзья
                  {friendsList.length > 0 && (
                    <span className={styles.friendsTabCount}>
                      {friendsList.length}
                    </span>
                  )}
                </button>
              </div>
              <button className={styles.searchClose} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.friendsBody}>
              {friendsListLoading ? (
                <div className={styles.friendsEmpty}>
                  <p>Загрузка...</p>
                </div>
              ) : friendsList.length === 0 ? (
                <div className={styles.friendsEmpty}>
                  <Users size={48} strokeWidth={1.2} />
                  <p>Список друзей пуст</p>
                </div>
              ) : (
                <div className={styles.friendsGrid}>
                  {friendsList.map((f: any) => {
                    const hasEffect =
                      f.effectShimmer ||
                      f.effectBorderGlow ||
                      f.effectAvatarGlow ||
                      f.effectVerifiedBadge;
                    return (
                      <Link
                        key={f.id}
                        href={`/profile/${f.username}`}
                        onClick={closeModal}
                        className={`${styles.friendCard}${hasEffect ? ` ${styles.friendCardPrivileged}` : ""}`}
                        style={getFriendCardStyle(f)}
                      >
                        <div className={styles.friendCardBanner}>
                          {f.hasBanner ? (
                            <ProtectedImage
                              src={`${API_URL}/api/media/${f.username}/banner`}
                              alt=""
                              className={styles.friendCardBannerImg}
                            />
                          ) : (
                            <div className={styles.friendCardBannerFallback} />
                          )}
                          <div className={styles.friendCardBannerOverlay} />
                          {f.effectShimmer && (
                            <div className={styles.friendCardShimmer} />
                          )}
                          {f.effectBorderGlow && (
                            <div className={styles.friendCardGlow} />
                          )}
                        </div>
                        <div className={styles.friendCardBody}>
                          <div className={styles.friendAvatarWrap}>
                            <div
                              className={`${styles.friendAvatar}${f.effectAvatarGlow ? ` ${styles.friendAvatarGlow}` : ""}`}
                            >
                              {f.hasAvatar ? (
                                <ProtectedImage
                                  src={`${API_URL}/api/media/${f.username}/avatar`}
                                  alt={f.displayName}
                                  className={styles.friendAvatarImg}
                                />
                              ) : (
                                <span>{f.displayName.charAt(0)}</span>
                              )}
                            </div>
                            <UserStatusIndicator
                              userId={f.id}
                              size="sm"
                              dotOnly
                            />
                          </div>
                          <div className={styles.friendInfo}>
                            <span className={styles.friendName}>
                              {f.displayName}
                            </span>
                            <span className={styles.friendHandle}>
                              @{f.username}
                            </span>
                            <span
                              className={styles.friendRoleBadge}
                              style={{
                                color: f.role?.color,
                                borderColor: f.role?.color,
                              }}
                            >
                              {f.role?.displayName}
                            </span>
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

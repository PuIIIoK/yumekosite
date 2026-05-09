"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sparkles, Crown, Star, Shield, ShieldCheck, BadgeCheck, UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import { useAuth, type User, type Role } from "@/context/AuthContext";
import Header from "@/components/Header/Header";
import ProtectedImage from "@/components/ProtectedImage/ProtectedImage";
import styles from "./profile.module.scss";
import { API_URL } from "@/config/hosts";

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
    imageVersion: Date.now(),
    effects: {
      effectShimmer: dto.effectShimmer ?? false,
      effectBorderGlow: dto.effectBorderGlow ?? false,
      effectAvatarGlow: dto.effectAvatarGlow ?? false,
      effectVerifiedBadge: dto.effectVerifiedBadge ?? false,
      accentColor: dto.accentColor ?? null,
    },
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const username = (params?.username as string) ?? "";
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [friendCount, setFriendCount] = useState(0);
  const [friendLoading, setFriendLoading] = useState(false);

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

  const nameParts = profileUser.displayName.split(/(?=[A-ZА-Я])/);

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
              {nameParts[0]}
              {nameParts[1] && <span>{nameParts[1]}</span>}
            </h1>
            <div className={styles.heroSubRow}>
              <span className={styles.handle}>{profileUser.handle}</span>
              {fx.effectVerifiedBadge && (
                <span className={styles.verifiedBadge}>
                  <BadgeCheck size={13} strokeWidth={2.5} />
                </span>
              )}
              <span className={`${styles.roleBadge}${hasAnyEffect ? ` ${styles.roleBadgeGlow}` : ""}`} style={{ borderColor: profileUser.role.color, color: profileUser.role.color }}>
                {profileUser.role.name === "ADMIN" && <Crown size={11} strokeWidth={2.5} />}
                {profileUser.role.name === "PRE_ADMIN" && <Shield size={11} strokeWidth={2.5} />}
                {profileUser.role.name === "ST_MODERATOR" && <ShieldCheck size={11} strokeWidth={2.5} />}
                {profileUser.role.name === "MODERATOR" && <Shield size={11} strokeWidth={2.5} />}
                {profileUser.role.name === "USER" && <Star size={11} strokeWidth={2.5} />}
                {profileUser.role.displayName}
              </span>
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
            <div className={`${styles.avatarFrame}${fx.effectAvatarGlow ? ` ${styles.avatarFramePrivileged}` : ""}`}>
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
          <div className={styles.statCell}>
            <span className={styles.statIndex}>02 / 01</span>
            <span className={styles.statValue}>00</span>
            <span className={styles.statLabel}>в списке</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statIndex}>02 / 02</span>
            <span className={styles.statValue}>00</span>
            <span className={styles.statLabel}>просмотрено</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statIndex}>02 / 03</span>
            <span className={styles.statValue}>00</span>
            <span className={styles.statLabel}>избранное</span>
          </div>
          <div className={styles.statCell}>
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
              <p className={styles.emptyText}>no_recent_activity.log</p>
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
                  <span className={styles.infoLabel}>Создан</span>
                  <span className={styles.infoValue}>сегодня</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Уровень</span>
                  <span className={styles.infoValue}>01</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Роль</span>
                  <span className={styles.infoValue}>{profileUser.role.displayName}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Бейджи</span>
                  <span className={styles.profileBadges}>
                    <span
                      className={styles.profileBadge}
                      style={{ color: profileUser.role.color }}
                      title={profileUser.role.displayName}
                    >
                      {profileUser.role.name === "ADMIN" && <Crown size={15} strokeWidth={2.4} />}
                      {profileUser.role.name === "PRE_ADMIN" && <Shield size={15} strokeWidth={2.4} />}
                      {profileUser.role.name === "ST_MODERATOR" && <ShieldCheck size={15} strokeWidth={2.4} />}
                      {profileUser.role.name === "MODERATOR" && <Shield size={15} strokeWidth={2.4} />}
                      {profileUser.role.name === "USER" && <Star size={15} strokeWidth={2.4} />}
                    </span>
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Регион</span>
                  <span className={styles.infoValue}>RU</span>
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
    </>
  );
}

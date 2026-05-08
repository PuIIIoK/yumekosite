"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, Sparkles, Pencil, Activity, Heart, Bookmark, Eye, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header/Header";
import styles from "./profile.module.scss";

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const username = (params?.username as string) ?? "";

  useEffect(() => {
    if (auth.user === null) {
      const raw = typeof window !== "undefined" ? localStorage.getItem("yumeko-auth") : null;
      if (!raw) router.replace("/");
    }
  }, [auth.user, router]);

  if (!auth.user) {
    return (
      <>
        <Header />
        <main className={styles.profileWrap}>
          <div className={styles.loader}>Загрузка профиля…</div>
        </main>
      </>
    );
  }

  const isOwner = auth.user.username.toLowerCase() === username.toLowerCase();

  return (
    <>
      <Header />
      <main className={styles.profileWrap}>
        {/* Profile Card: banner + identity + stats unified */}
        <section className={styles.profileCard}>
          <div className={styles.banner}>
            <div className={styles.bannerGradient} />
            <div className={styles.bannerNoise} />
          </div>

          <div className={styles.identityBar}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar}>
                {auth.user.avatarUrl ? (
                  <img src={auth.user.avatarUrl} alt={auth.user.displayName} />
                ) : (
                  <span className={styles.avatarInitial}>{auth.user.displayName.charAt(0)}</span>
                )}
              </div>
              <span className={styles.statusDot} title="В сети" />
            </div>

            <div className={styles.identity}>
              <div className={styles.nameRow}>
                <h1 className={styles.displayName}>{auth.user.displayName}</h1>
                <span className={styles.adminBadge}>
                  <Sparkles size={11} strokeWidth={2.5} />
                  Admin
                </span>
              </div>
              <span className={styles.handle}>{auth.user.handle}</span>
            </div>

            {isOwner && (
              <button className={styles.editBtn}>
                <Pencil size={14} strokeWidth={2.2} />
                Редактировать
              </button>
            )}
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <Bookmark size={15} className={styles.statIcon} />
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>в списке</span>
            </div>
            <span className={styles.statSep} />
            <div className={styles.stat}>
              <Eye size={15} className={styles.statIcon} />
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>просмотрено</span>
            </div>
            <span className={styles.statSep} />
            <div className={styles.stat}>
              <Heart size={15} className={styles.statIcon} />
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>избранное</span>
            </div>
            <span className={styles.statSep} />
            <div className={styles.stat}>
              <Users size={15} className={styles.statIcon} />
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>подписчиков</span>
            </div>
          </div>
        </section>

        {/* Two-column layout */}
        <section className={styles.grid}>
          <div className={styles.mainCol}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>О себе</h2>
              </div>
              <p className={styles.emptyText}>
                Расскажите немного о себе, своих любимых жанрах и тайтлах.
              </p>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <Activity size={16} strokeWidth={2.2} />
                  Недавняя активность
                </h2>
              </div>
              <p className={styles.emptyText}>Пока пусто. Начните смотреть, чтобы здесь появилась активность.</p>
            </div>
          </div>

          <aside className={styles.sideCol}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Информация</h2>
              </div>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <Calendar size={14} className={styles.infoIcon} />
                  <span className={styles.infoLabel}>Зарегистрирован</span>
                  <span className={styles.infoValue}>сегодня</span>
                </div>
                <div className={styles.infoRow}>
                  <Sparkles size={14} className={styles.infoIcon} />
                  <span className={styles.infoLabel}>Уровень</span>
                  <span className={styles.infoValue}>1</span>
                </div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Бейджи</h2>
              </div>
              <div className={styles.badgesRow}>
                <div className={styles.badge} title="Ранний пользователь">
                  <Sparkles size={18} />
                </div>
                <div className={`${styles.badge} ${styles.badgeLocked}`} title="Заблокировано" />
                <div className={`${styles.badge} ${styles.badgeLocked}`} title="Заблокировано" />
                <div className={`${styles.badge} ${styles.badgeLocked}`} title="Заблокировано" />
              </div>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

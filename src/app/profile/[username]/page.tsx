"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sparkles, Pencil, Crown, Star } from "lucide-react";
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

  const nameParts = auth.user.displayName.split(/(?=[A-ZА-Я])/);

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
            <span>{auth.user.handle.replace("@", "").toUpperCase()}</span>
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
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <span className={styles.heroIndex}>// 01 — IDENTITY</span>
            <h1 className={styles.displayName}>
              {nameParts[0]}
              {nameParts[1] && <span>{nameParts[1]}</span>}
            </h1>
            <div className={styles.heroSubRow}>
              <span className={styles.handle}>{auth.user.handle}</span>
              <span className={styles.adminBadge}>
                <Sparkles size={11} strokeWidth={2.5} />
                Admin
              </span>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.avatarFrame}>
              {auth.user.avatarUrl ? (
                <img src={auth.user.avatarUrl} alt={auth.user.displayName} />
              ) : (
                <span className={styles.avatarInitial}>{auth.user.displayName.charAt(0)}</span>
              )}
            </div>
            {isOwner && (
              <button className={styles.editBtn}>
                <Pencil size={12} strokeWidth={2.2} />
                Edit Profile
              </button>
            )}
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
            <span className={styles.statValue}>00</span>
            <span className={styles.statLabel}>подписчики</span>
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
                Расскажите немного о себе, своих любимых жанрах и тайтлах.
                Пока этот раздел пустует — самое время заполнить его.
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
                  <span className={styles.infoValue}>ADMIN</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Бейджи</span>
                  <span className={styles.profileBadges}>
                    <span
                      className={`${styles.profileBadge} ${styles.profileBadgeAdmin}`}
                      title="Администратор"
                    >
                      <Crown size={15} strokeWidth={2.4} />
                    </span>
                    <span
                      className={`${styles.profileBadge} ${styles.profileBadgeEarly}`}
                      title="Ранний пользователь"
                    >
                      <Sparkles size={15} strokeWidth={2.4} />
                    </span>
                    <span
                      className={`${styles.profileBadge} ${styles.profileBadgeStar}`}
                      title="Избранный"
                    >
                      <Star size={15} strokeWidth={2.4} />
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
        <section className={styles.footerMark}>
          <span>YUMEKO / PROFILE / {auth.user.handle.replace("@", "").toUpperCase()}</span>
          <span>END / OF / FILE</span>
        </section>
      </main>
    </>
  );
}

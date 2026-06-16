"use client";

import Link from "next/link";
import Header from "@/components/Header/Header";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Edit3, ExternalLink, Globe, Link2, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/hosts";
import styles from "./studio.module.scss";

interface StudioData {
  id: number;
  name: string;
  description: string | null;
  headUsername: string | null;
  avatar: string | null;
  banner: string | null;
  socials: string | null;
  website: string | null;
  isCollaboration: boolean;
}

interface SocialLink {
  id: string;
  label: string;
  url: string;
}

const splitLines = (value: string | null | undefined) =>
  value
    ? value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

const buildHref = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const parseSocialLinks = (value: string | null | undefined): SocialLink[] =>
  splitLines(value).map((line, index) => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    const label = match?.[1]?.trim() || `Ссылка ${index + 1}`;
    const url = (match?.[2] || line).trim();

    return {
      id: `${index}-${label}-${url}`,
      label,
      url,
    };
  });

const displayHost = (value: string) => {
  try {
    return new URL(buildHref(value)).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
};

export default function StudioPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const { user } = useAuth();
  const [studio, setStudio] = useState<StudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isHead = user?.username?.toLowerCase() === studio?.headUsername?.toLowerCase();
  const socialLinks = useMemo(() => parseSocialLinks(studio?.socials), [studio?.socials]);
  const websiteHref = studio?.website ? buildHref(studio.website) : "";
  const headProfileHref = studio?.headUsername ? `/profile/${studio.headUsername}` : "";

  useEffect(() => {
    fetch(`${API_URL}/api/studios/${id}`)
      .then((response) => {
        if (!response.ok) throw new Error("not found");
        return response.json();
      })
      .then((data: StudioData) => setStudio(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.loadingWrap}>
            <div className={styles.loading}>Загрузка...</div>
          </div>
        </main>
      </>
    );
  }

  if (notFound || !studio) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.loadingWrap}>
            <div className={styles.loading}>Студия не найдена</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.studioWrap}>
          <div className={styles.metaBar}>
            <div className={styles.metaLeft}>
              <Link href="/">Главная</Link>
              <span className={styles.metaDivider} />
              <span>Студии</span>
              <span className={styles.metaDivider} />
              <span>{studio.name}</span>
            </div>

            <div className={styles.metaRight}>
              <span className={styles.metaChip}>
                <Users size={12} />
                {socialLinks.length} links
              </span>
              <span className={styles.metaChip}>
                {studio.isCollaboration ? "PUBLIC" : "HIDDEN"}
              </span>
              {isHead && (
                <Link href={`/studio/${studio.id}/edit`} className={styles.metaChipLink}>
                  <Edit3 size={12} />
                  Edit
                </Link>
              )}
            </div>
          </div>

          <section className={styles.heroPrivileged}>
            <div className={styles.heroShimmer} />
            <div className={styles.heroBorderGlow} />

            <aside
              className={styles.posterCard}
              style={studio.banner ? { backgroundImage: `url(${studio.banner})` } : undefined}
            >
              <div className={styles.posterTop}>
                <span className={styles.badgeMono}>{studio.isCollaboration ? "ACTIVE" : "SILENT"}</span>
                <span className={styles.badgeMono}>{socialLinks.length} social</span>
              </div>

              <div className={styles.posterAvatarWrap}>
                {studio.avatar ? (
                  <img src={studio.avatar} alt={studio.name} className={styles.posterAvatar} />
                ) : (
                  <div className={styles.posterAvatarPlaceholder}>{studio.name.charAt(0)}</div>
                )}
              </div>
            </aside>

            <article className={styles.heroInfo}>
              <div className={styles.heroHead}>
                <div className={styles.heroLabel}>Studio profile</div>
                {isHead && (
                  <Link href={`/studio/${studio.id}/edit`} className={styles.editBtn}>
                    <Edit3 size={14} />
                    Редактировать
                  </Link>
                )}
              </div>

              <h1 className={styles.title}>{studio.name}</h1>
              <p className={styles.subtitle}>
                {studio.description || "Описание студии пока не заполнено."}
              </p>

              <div className={styles.badgeRow}>
                {studio.headUsername && headProfileHref && (
                  <Link href={headProfileHref} className={styles.badgeLink}>
                    <Users size={13} />
                    @{studio.headUsername}
                  </Link>
                )}

                {studio.website && websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.badgeLink}
                  >
                    <Globe size={13} />
                    {displayHost(studio.website)}
                    <ExternalLink size={11} />
                  </a>
                )}

                <span className={styles.badgeStatic}>
                  {studio.isCollaboration ? "PUBLIC COLLAB" : "PRIVATE COLLAB"}
                </span>
              </div>

              <div className={styles.statGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>ID</span>
                  <strong className={styles.statValue}>#{studio.id}</strong>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>SOCIALS</span>
                  <strong className={styles.statValue}>{socialLinks.length}</strong>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>STATUS</span>
                  <strong className={styles.statValue}>{studio.isCollaboration ? "ON" : "OFF"}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.panelKicker}>Links</div>
                <h2 className={styles.panelTitle}>Социальные сети студии</h2>
              </div>
              <span className={styles.panelHint}>каждая карточка ведёт на внешнюю ссылку</span>
            </div>

            {socialLinks.length > 0 ? (
              <div className={styles.socialGrid}>
                {socialLinks.map((item) => {
                  const href = buildHref(item.url);
                  const host = displayHost(item.url);

                  return (
                    <a
                      key={item.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialCard}
                    >
                      <div className={styles.socialIcon}>
                        <Link2 size={15} />
                      </div>
                      <div className={styles.socialBody}>
                        <div className={styles.socialTitle}>{item.label || host}</div>
                        <div className={styles.socialUrl}>{host}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyBlock}>
                <ShieldCheck size={18} />
                <span>Социальные сети не указаны.</span>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

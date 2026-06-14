"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header/Header";
import { API_URL } from "@/config/hosts";
import { Globe, Mail, Users } from "lucide-react";
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
  contact: string | null;
  isCollaboration: boolean;
}

export default function StudioPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const [studio, setStudio] = useState<StudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/studios/${id}`)
      .then((r) => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then((data: StudioData) => setStudio(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <><Header /><main className={styles.main}><div className={styles.container}><div className={styles.loading}>Загрузка...</div></div></main></>;
  if (notFound || !studio) return <><Header /><main className={styles.main}><div className={styles.container}><div className={styles.loading}>Студия не найдена</div></div></main></>;

  const socialLines = studio.socials ? studio.socials.split("\n").filter(Boolean) : [];

  return (<>
    <Header />
    <main className={styles.main}>
      <div className={styles.bannerWrap}>
        <div className={styles.banner} style={studio.banner ? { backgroundImage: `url(${studio.banner})` } : undefined} />
        <div className={styles.bannerOverlay} />
      </div>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.avatarWrap}>
            {studio.avatar ? <img src={studio.avatar} alt={studio.name} className={styles.avatar} /> : <div className={styles.avatarPlaceholder}>{studio.name.charAt(0)}</div>}
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{studio.name}</h1>
              {studio.isCollaboration && <span className={styles.badge}>Коллаборация</span>}
            </div>
            {studio.description && <p className={styles.desc}>{studio.description}</p>}
            <div className={styles.meta}>
              {studio.headUsername && <Link href={`/profile/${studio.headUsername}`} className={styles.metaLink}><Users size={14} /> @{studio.headUsername}</Link>}
              {studio.website && <a href={studio.website} target="_blank" rel="noopener noreferrer" className={styles.metaLink}><Globe size={14} /> {studio.website.replace(/^https?:\/\//, "")}</a>}
              {studio.contact && <span className={styles.metaItem}><Mail size={14} /> {studio.contact}</span>}
            </div>
          </div>
        </div>
        {socialLines.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Социальные сети</h2>
            <div className={styles.socials}>{socialLines.map((line: string, i: number) => <span key={i} className={styles.socialItem}>{line}</span>)}</div>
          </div>
        )}
      </div>
    </main>
  </>);
}
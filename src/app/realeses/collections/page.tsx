"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Play,
  BookOpen,
  Check,
  Pause,
  X,
  Heart,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header/Header";
import { type AnimePreview, getAccent } from "@/data/anime";
import { API_URL } from "@/config/hosts";
import styles from "./collections.module.scss";

interface CollectionItem {
  animeId: number;
  status: string;
  anime?: AnimePreview;
}

const STATUS_TABS = [
  { key: "favorites", label: "Избранное", Icon: Heart },
  { key: "watching", label: "Смотрю", Icon: Play },
  { key: "planned", label: "В планах", Icon: BookOpen },
  { key: "completed", label: "Просмотренно", Icon: Check },
  { key: "onhold", label: "Отложено", Icon: Pause },
  { key: "dropped", label: "Брошено", Icon: X },
];

export default function CollectionsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("favorites");
  const [gridKey, setGridKey] = useState(0);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [animeMap, setAnimeMap] = useState<Record<number, AnimePreview>>({});
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && user === null) {
      router.push("/");
    }
  }, [isAuthenticated, user, router]);

  // Scroll active tab into view
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeEl = tabsRef.current.querySelector(
      "[data-active='true']"
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    const deltaX = touchCurrentX.current - touchStartX.current;
    const swipeThreshold = 50;
    const currentIndex = STATUS_TABS.findIndex((tab) => tab.key === activeTab);

    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0 && currentIndex > 0) {
        const next = STATUS_TABS[currentIndex - 1].key;
        setActiveTab(next);
        setGridKey((k) => k + 1);
      } else if (deltaX < 0 && currentIndex < STATUS_TABS.length - 1) {
        const next = STATUS_TABS[currentIndex + 1].key;
        setActiveTab(next);
        setGridKey((k) => k + 1);
      }
    }

    touchStartX.current = 0;
    touchCurrentX.current = 0;
  }, [activeTab]);

  // Fetch collections + anime catalog
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    Promise.all([
      fetch(`${API_URL}/api/collections/${user.username}`).then((r) =>
        r.json()
      ),
      fetch(`${API_URL}/api/anime`).then((r) => r.json()),
    ])
      .then(([collData, animeData]: [CollectionItem[], AnimePreview[]]) => {
        // Build anime lookup map
        const map: Record<number, AnimePreview> = {};
        if (Array.isArray(animeData)) {
          for (const a of animeData) {
            map[a.id] = a;
          }
        }
        setAnimeMap(map);

        // Enrich collection items with anime data
        const enriched = Array.isArray(collData)
          ? collData.map((item) => ({
              ...item,
              anime: item.anime ?? map[item.animeId],
            }))
          : [];
        setCollectionItems(enriched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Filter by active tab — only items that have anime data
  const filteredItems = collectionItems.filter(
    (item) => item.status === activeTab && item.anime
  );

  // Count per tab (all items regardless of anime presence)
  const countForTab = (key: string) =>
    collectionItems.filter((i) => i.status === key).length;

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      <Header />
      <main
        className={styles.main}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.container}>
          {/* Desktop Header only */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Мои коллекции</h1>
            <p className={styles.pageSubtitle}>
              {collectionItems.length} тайтлов в вашей коллекции
            </p>
          </div>

          {/* Tabs */}
          <div className={styles.tabsWrapper}>
            <div className={styles.tabs} ref={tabsRef}>
              {STATUS_TABS.map((tab) => {
                // eslint-disable-next-line no-unused-vars
                const count = countForTab(tab.key);
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    data-active={isActive}
                    className={isActive ? styles.tabActive : styles.tab}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setGridKey((k) => k + 1);
                    }}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={styles.tabCount}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className={styles.contentArea}>
            {loading ? (
              <div className={styles.loading}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Загрузка коллекции...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  {(() => {
                    const tab = STATUS_TABS.find((t) => t.key === activeTab);
                    if (!tab) return null;
                    const Icon = tab.Icon;
                    return <Icon size={40} />;
                  })()}
                </div>
                <p className={styles.emptyTitle}>Список пуст</p>
                <p className={styles.emptyText}>
                  Добавьте аниме в &ldquo;
                  {STATUS_TABS.find((t) => t.key === activeTab)?.label}&rdquo;
                </p>
              </div>
            ) : (
              <div className={styles.animeGrid} key={gridKey}>
                {filteredItems.map((item, idx) => (
                  <AnimeCard
                    key={item.animeId}
                    anime={item.anime!}
                    accent={getAccent(item.anime?.rating || "16+")}
                    index={idx}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// Anime Card Component
function AnimeCard({
  anime,
  accent,
  index,
}: {
  anime: AnimePreview;
  accent: string;
  index: number;
}) {
  if (!anime) return null;

  return (
    <Link
      href={`/realeses/anime-page/${anime.id}`}
      className={styles.animeCard}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className={styles.animePoster}>
        {anime.poster && (
          <img
            src={anime.poster}
            alt={anime.title}
            className={styles.animePosterImg}
            loading="lazy"
          />
        )}
        <div className={styles.animeAccentBar} style={{ background: accent }} />
        <div className={styles.animeRating}>{anime.rating}</div>
        {anime.ep && <div className={styles.animeEpBadge}>{anime.ep}</div>}
      </div>
      <div className={styles.animeInfo}>
        <div className={styles.animeTitle}>{anime.title}</div>
      </div>
    </Link>
  );
}

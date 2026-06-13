"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRight,
  Heart,
  Play,
  ListPlus,
  Sparkles,
  Star,
  Check,
  BookOpen,
  Clock,
  Pause,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header/Header";
import { type AnimePreview, getAccent as getAccentFn, isAnimeHidden } from "@/data/anime";
import { API_URL } from "@/config/hosts";
import styles from "./page.module.scss";

// ── Banner Slides ──────────────────────────────────
interface BannerSlide {
  id: number;
  title: string;
  season: string;
  year: string;
  rating: string;
  genres: string;
  text: string;
  image: string;
  borderColor: string;
  buttonLink: string;
  buttonLabel: string;
  sortOrder: number;
  active: boolean;
  type: string; // "anime" | "promo"
  animeId: number | null;
  badge: string;
}

const COLLECTION_STATUSES = [
  { key: "watching", label: "Смотрю", Icon: Play },
  { key: "planned", label: "Планирую", Icon: BookOpen },
  { key: "completed", label: "Просмотрено", Icon: Check },
  { key: "onhold", label: "Отложено", Icon: Pause },
  { key: "dropped", label: "Брошено", Icon: X },
];

const getAccent = getAccentFn;

// ── Schedule Data ──────────────────────────────────
interface ScheduleItem {
  id: number;
  title: string;
  ep: string;
  meta: string;
  rating: string;
  genres: string;
  duration?: string;
}

const scheduleData: Record<string, ScheduleItem[]> = {
  yesterday: [
    {
      id: 1,
      title: "Принцесса-рыцарь — невеста варвара",
      ep: "Эпизод 3",
      meta: "2026 • Весна • ТВ",
      rating: "16+",
      genres: "Комедия • Романтика • Сэйнэн",
    },
    {
      id: 2,
      title: "Доктор Стоун: Научное будущее. Часть 3",
      ep: "Эпизод 4",
      meta: "2026 • Весна • ТВ",
      rating: "16+",
      genres: "Комедия • Приключения • Сёнэн",
    },
  ],
  today: [
    {
      id: 3,
      title: "Я переродился торговым автоматом и скитаюсь по лабиринту 3",
      ep: "Эпизод 4",
      meta: "2026 • Весна • ТВ",
      rating: "16+",
      genres: "Исекай • Комедия",
      duration: "23:43",
    },
    {
      id: 4,
      title: "Авантюрист, пожирающий демонов",
      ep: "Эпизод 4",
      meta: "2026 • Весна • ТВ",
      rating: "16+",
      genres: "Фэнтези • Экшен",
    },
    {
      id: 5,
      title: "Тетрадь дружбы Нацумэ 7",
      ep: "Эпизод 3",
      meta: "2026 • Весна • ТВ",
      rating: "12+",
      genres: "Драма • Сверхъестественное",
    },
    {
      id: 6,
      title: "Восхождение героя щита 4",
      ep: "Эпизод 5",
      meta: "2026 • Весна • ТВ",
      rating: "16+",
      genres: "Исекай • Приключения",
    },
  ],
  tomorrow: [
    {
      id: 7,
      title: "Моя геройская академия: Бдительность",
      ep: "Эпизод 7",
      meta: "2026 • Весна • ТВ",
      rating: "16+",
      genres: "Экшен • Сёнэн",
    },
    {
      id: 8,
      title: "Великий из бродячих псов 6",
      ep: "Эпизод 2",
      meta: "2026 • Весна • ТВ",
      rating: "16+",
      genres: "Экшен • Мистика",
    },
    {
      id: 9,
      title: "Синий оркестр",
      ep: "Эпизод 10",
      meta: "2026 • Весна • ТВ",
      rating: "12+",
      genres: "Музыка • Драма",
    },
  ],
};

// ═════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════
export default function Home() {
  const { user } = useAuth();
  const [slide, setSlide] = useState(0);
  const [activeDay, setActiveDay] = useState("today");
  const [newEpisodes, setNewEpisodes] = useState<AnimePreview[]>([]);
  const [bannerSlides, setBannerSlides] = useState<BannerSlide[]>([]);

  // Collection / favorites state for current slide
  const [isFavorite, setIsFavorite] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState<string | null>(null);
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const collectionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/anime`)
      .then((r) => r.json())
      .then((data: AnimePreview[]) =>
        setNewEpisodes(data.filter((anime) => !isAnimeHidden(anime))),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/banners`)
      .then((r) => r.json())
      .then((data: BannerSlide[]) => setBannerSlides(data))
      .catch(() => {});
  }, []);

  // Fetch collection status when slide or user changes
  useEffect(() => {
    const current = bannerSlides[slide];
    if (!user || !current?.animeId || current.type !== "anime") {
      setIsFavorite(false);
      setCollectionStatus(null);
      return;
    }
    fetch(
      `${API_URL}/api/collections/${user.username}/anime/${current.animeId}`,
    )
      .then((r) => r.json())
      .then((data: { statuses: string[] }) => {
        setIsFavorite(data.statuses?.includes("favorites") ?? false);
        const listStatus =
          data.statuses?.find((s) =>
            ["watching", "planned", "completed", "onhold", "dropped"].includes(
              s,
            ),
          ) ?? null;
        setCollectionStatus(listStatus);
      })
      .catch(() => {});
  }, [slide, bannerSlides, user]);

  // Close collection menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        collectionMenuRef.current &&
        !collectionMenuRef.current.contains(e.target as Node)
      ) {
        setShowCollectionMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleFavorite = async () => {
    const current = bannerSlides[slide];
    if (!user || !current?.animeId) return;
    setCollectionLoading(true);
    try {
      await fetch(
        `${API_URL}/api/collections/${user.username}/anime/${current.animeId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "favorites" }),
        },
      );
      setIsFavorite((v) => !v);
    } catch {}
    setCollectionLoading(false);
  };

  const toggleCollectionStatus = async (status: string) => {
    const current = bannerSlides[slide];
    if (!user || !current?.animeId) return;
    setCollectionLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/collections/${user.username}/anime/${current.animeId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await res.json();
      const listStatus =
        (data.statuses as string[])?.find((s) =>
          ["watching", "planned", "completed", "onhold", "dropped"].includes(s),
        ) ?? null;
      setCollectionStatus(listStatus);
    } catch {}
    setCollectionLoading(false);
    setShowCollectionMenu(false);
  };

  const prevSlide = () =>
    setSlide((s) => (s === 0 ? bannerSlides.length - 1 : s - 1));
  const nextSlide = () =>
    setSlide((s) => (s === bannerSlides.length - 1 ? 0 : s + 1));

  const currentSlide = bannerSlides[slide];
  const isAnime = currentSlide?.type === "anime" || !currentSlide?.type;

  const days = [
    { key: "yesterday", label: "Вчера" },
    { key: "today", label: "Сегодня" },
    { key: "tomorrow", label: "Завтра" },
  ];

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* ── Hero Banner ── */}
        {bannerSlides.length > 0 && (
          <section className={`${styles.hero} ${styles.container}`}>
            <div
              className={`${styles.banner} ${!isAnime ? styles.bannerPromo : ""}`}
              style={{
                ...(currentSlide?.image
                  ? { backgroundImage: `url(${currentSlide.image})` }
                  : {}),
                ...(currentSlide?.borderColor
                  ? { borderColor: currentSlide.borderColor }
                  : {}),
              }}
            >
              <div
                className={`${styles.bannerOverlay} ${!isAnime ? styles.bannerOverlayPromo : ""}`}
              />

              {/* ── ANIME slide ── */}
              {isAnime && (
                <div className={styles.bannerSlide} key={slide}>
                  <h2 className={styles.bannerTitle}>{currentSlide?.title}</h2>
                  {(currentSlide?.season ||
                    currentSlide?.year ||
                    currentSlide?.rating) && (
                    <div className={styles.bannerMeta}>
                      {currentSlide?.season && (
                        <span>{currentSlide.season}</span>
                      )}
                      {currentSlide?.year && <span>{currentSlide.year}</span>}
                      {currentSlide?.rating && (
                        <span>{currentSlide.rating}</span>
                      )}
                    </div>
                  )}
                  {currentSlide?.genres && (
                    <div className={styles.bannerGenres}>
                      {currentSlide.genres}
                    </div>
                  )}
                  <p className={styles.bannerText}>{currentSlide?.text}</p>

                  <div className={styles.bannerActions}>
                    {currentSlide?.animeId ? (
                      <Link
                        href={`/realeses/anime-page/${currentSlide.animeId}`}
                        className={styles.bannerPlayBtn}
                      >
                        <Play size={16} />{" "}
                        {currentSlide.buttonLabel || "Смотреть"}
                      </Link>
                    ) : currentSlide?.buttonLink ? (
                      <Link
                        href={currentSlide.buttonLink}
                        className={styles.bannerPlayBtn}
                      >
                        <Play size={16} />{" "}
                        {currentSlide.buttonLabel || "Смотреть"}
                      </Link>
                    ) : (
                      <button className={styles.bannerPlayBtn}>
                        <Play size={16} />{" "}
                        {currentSlide?.buttonLabel || "Смотреть"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── PROMO slide ── */}
              {!isAnime && (
                <div className={styles.bannerPromoSlide} key={slide}>
                  {currentSlide?.badge && (
                    <div className={styles.bannerPromoBadge}>
                      <Sparkles size={12} />
                      {currentSlide.badge}
                    </div>
                  )}
                  <h2 className={styles.bannerPromoTitle}>
                    {currentSlide?.title}
                  </h2>
                  <p className={styles.bannerPromoText}>{currentSlide?.text}</p>
                  {currentSlide?.buttonLink && (
                    <Link
                      href={currentSlide.buttonLink}
                      className={styles.bannerPromoBtn}
                    >
                      <Heart size={15} />
                      {currentSlide.buttonLabel || "Подробнее"}
                    </Link>
                  )}
                </div>
              )}

              <div className={styles.bannerNav}>
                <button
                  className={styles.bannerArrow}
                  onClick={prevSlide}
                  aria-label="Назад"
                >
                  <ChevronLeft size={18} />
                </button>
                {bannerSlides.map((_, i) => (
                  <button
                    key={i}
                    className={
                      i === slide ? styles.bannerDotActive : styles.bannerDot
                    }
                    onClick={() => setSlide(i)}
                    aria-label={`Слайд ${i + 1}`}
                  />
                ))}
                <button
                  className={styles.bannerArrow}
                  onClick={nextSlide}
                  aria-label="Вперёд"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── New Anime ── */}
        <section className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <Link href="/realeses" className={styles.sectionTitle}>
                Новые релизы <ArrowRight size={18} />
              </Link>
              <p className={styles.sectionSubtitle}>
                Последние добавленные релизы на сайте
              </p>
            </div>
            <div className={styles.sectionHeaderRight}>
              <Link href="/realeses" className={styles.sectionAllLink}>
                Все релизы <ArrowRight size={13} />
              </Link>
              <div className={styles.scrollArrows}>
                <button
                  className={styles.scrollArrow}
                  onClick={() => {
                    const el = document.getElementById("epRow");
                    if (el) el.scrollBy({ left: -300, behavior: "smooth" });
                  }}
                  aria-label="Назад"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className={styles.scrollArrow}
                  onClick={() => {
                    const el = document.getElementById("epRow");
                    if (el) el.scrollBy({ left: 300, behavior: "smooth" });
                  }}
                  aria-label="Вперёд"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div id="epRow" className={styles.episodesRow}>
            {newEpisodes.map((ep) => (
              <Link
                key={ep.id}
                href={`/realeses/anime-page/${ep.id}`}
                className={styles.episodeCard}
              >
                {/* ── Poster ── */}
                <div className={styles.episodePoster}>
                  {ep.poster && (
                    <img
                      src={ep.poster}
                      alt={ep.title}
                      className={styles.episodePosterImg}
                      loading="lazy"
                    />
                  )}
                  <div
                    className={styles.episodeAccentBar}
                    style={{ background: getAccent(ep.rating) }}
                  />
                  <div className={styles.episodeRating}>{ep.rating}</div>
                  <div className={styles.episodePosterOverlay}>
                    <span
                      className={styles.episodePlayBtn}
                      aria-label="Смотреть"
                    >
                      <Play size={20} strokeWidth={2.5} />
                    </span>
                  </div>
                </div>

                {/* ── Info ── */}
                <div className={styles.episodeInfo}>
                  <div className={styles.episodeTitle}>{ep.title}</div>
                  <div className={styles.episodeMeta}>{ep.meta}</div>
                  <div
                    className={styles.episodeGenres}
                    style={{ color: getAccent(ep.rating) }}
                  >
                    {ep.genres}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Support Banner ── */}
        <section className={styles.supportSection}>
          <div className={styles.supportBanner}>
            {/* Ambient glow orbs */}
            <div className={styles.supportGlow1} />
            <div className={styles.supportGlow2} />

            {/* Left: content */}
            <div className={styles.supportContent}>
              <div className={styles.supportLabel}>
                <Sparkles size={12} /> Поддержать проект
              </div>
              <h3 className={styles.supportTitle}>
                Вам нравится{" "}
                <span className={styles.supportTitleAccent}>Yumeko?</span>
              </h3>
              <p className={styles.supportText}>
                Помогите нам развиваться и делать лучше. Каждый вклад — это
                новый эпизод, новая озвучка и любовь команды.
              </p>

              {/* Perks */}
              <ul className={styles.supportPerks}>
                <li>Закрытый чат в Telegram</li>
                <li>Спецстатус на Discord сервере</li>
                <li>Ранний доступ к релизам</li>
              </ul>

              <button className={styles.supportBtn}>
                <Heart size={15} />
                Поддержать
              </button>
            </div>

            {/* Right: decorative heart */}
            <div className={styles.supportDeco}>
              <div className={styles.supportDecoRing} />
              <Heart size={64} className={styles.supportDecoHeart} />
            </div>
          </div>
        </section>

        {/* Schedule section removed */}
        {false && (
          <section className={styles.container}>
            <div className={styles.scheduleHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  Расписание релизов <ArrowRight size={18} />
                </h2>
                <p className={styles.sectionSubtitle}>
                  Список релизов, над которыми команда трудится прямо сейчас
                </p>
              </div>

              {/* Segmented tabs */}
              <div className={styles.scheduleTabs}>
                {days.map((d) => (
                  <button
                    key={d.key}
                    className={
                      activeDay === d.key
                        ? styles.scheduleTabActive
                        : styles.scheduleTab
                    }
                    onClick={() => setActiveDay(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className={styles.scheduleList}>
              {scheduleData[activeDay].map((item, idx) => {
                const accent = getAccent(item.rating);
                const tags = item.genres
                  .split(",")
                  .map((t: string) => t.trim())
                  .filter(Boolean);
                return (
                  <div key={item.id} className={styles.scheduleItem}>
                    {/* Left accent bar */}
                    <div
                      className={styles.scheduleItemBar}
                      style={{ background: accent }}
                    />
                    {/* Index */}
                    <span className={styles.scheduleItemIdx}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {/* Main info */}
                    <div className={styles.scheduleItemMain}>
                      <div className={styles.scheduleItemTitle}>
                        {item.title}
                      </div>
                      <div className={styles.scheduleItemSub}>
                        <span
                          style={{ color: accent }}
                          className={styles.scheduleItemEp}
                        >
                          {item.ep}
                        </span>
                        <span className={styles.scheduleItemMeta}>
                          {item.meta}
                        </span>
                      </div>
                      <div className={styles.scheduleItemTags}>
                        {tags.map((tag) => (
                          <span key={tag} className={styles.scheduleItemTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Right actions */}
                    <div className={styles.scheduleItemActions}>
                      {item.duration && (
                        <span className={styles.scheduleItemTime}>
                          {item.duration}
                        </span>
                      )}
                      <button
                        className={styles.scheduleItemList}
                        aria-label="В список"
                      >
                        <ListPlus size={16} />
                      </button>
                      <button
                        className={styles.scheduleItemPlay}
                        style={{ borderColor: `${accent}66`, color: accent }}
                      >
                        <Play size={13} strokeWidth={2.5} />
                        Смотреть
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRight,
  Heart,
  Play,
  ListPlus,
  Sparkles,
  Star,
  ListVideo,
  ChevronDown,
} from "lucide-react";
import Header from "@/components/Header/Header";
import { type AnimePreview, getAccent as getAccentFn } from "@/data/anime";
import { API_URL } from "@/config/hosts";
import styles from "./page.module.scss";

// ── Banner Slides ──────────────────────────────────
const bannerSlides = [
  {
    title: "Ангел по соседству меня ужасно балует 2",
    season: "Весна",
    year: "2026",
    rating: "16+",
    genres: "Романтика • Школа",
    text: "После того как Аманэ и Махиру признались друг другу в чувствах на глазах у всей школы, их жизнь из тихой соседской идиллии превращается в официальный роман под пристальным вниманием окружающих. Теперь, когда маски сброшены, героям предстоит учиться быть настоящей парой не только за закрытыми дверями квартир, но и в глазах общества.",
    image: "https://media.myshows.me/shows/1920/d/4e/d4ea4fa7ee4c87c170c8783010f9b30e.jpg",
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  {
    title: "Добро пожаловать в класс превосходства 4: Второй год — Первый семестр",
    season: "Весна",
    year: "2026",
    rating: "16+",
    genres: "Драма • Психологическое • Триллер • Школа",
    text: "Аянокоджи и его одноклассники начинают свой второй год обучения в школе \"Кёдо Икусей\". Впереди их ждёт серия непростых экзаменов, а также знакомство с новой группой довольно своеобразных первогодок. Ученикам придётся быстро найти общий язык друг с другом, потому что первый экзамен объединит их классы в пары для письменного теста. Соли во всё это добавляет то, что за плохие результаты могут быть исключены только второгодки.",
    image: "/elite_class.png",
    borderColor: "rgba(220, 38, 38, 0.6)",
  },
  {
    title: "Поддержите проект",
    season: "",
    year: "",
    rating: "",
    genres: "",
    text: "Yumeko существует благодаря вашей поддержке. Если вам нравится то, что мы делаем — вы можете помочь нам развиваться. Каждый вклад важен для нашей команды.",
    image: "",
  },
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
    { id: 1, title: "Принцесса-рыцарь — невеста варвара", ep: "Эпизод 3", meta: "2026 • Весна • ТВ", rating: "16+", genres: "Комедия • Романтика • Сэйнэн" },
    { id: 2, title: "Доктор Стоун: Научное будущее. Часть 3", ep: "Эпизод 4", meta: "2026 • Весна • ТВ", rating: "16+", genres: "Комедия • Приключения • Сёнэн" },
  ],
  today: [
    { id: 3, title: "Я переродился торговым автоматом и скитаюсь по лабиринту 3", ep: "Эпизод 4", meta: "2026 • Весна • ТВ", rating: "16+", genres: "Исекай • Комедия", duration: "23:43" },
    { id: 4, title: "Авантюрист, пожирающий демонов", ep: "Эпизод 4", meta: "2026 • Весна • ТВ", rating: "16+", genres: "Фэнтези • Экшен" },
    { id: 5, title: "Тетрадь дружбы Нацумэ 7", ep: "Эпизод 3", meta: "2026 • Весна • ТВ", rating: "12+", genres: "Драма • Сверхъестественное" },
    { id: 6, title: "Восхождение героя щита 4", ep: "Эпизод 5", meta: "2026 • Весна • ТВ", rating: "16+", genres: "Исекай • Приключения" },
  ],
  tomorrow: [
    { id: 7, title: "Моя геройская академия: Бдительность", ep: "Эпизод 7", meta: "2026 • Весна • ТВ", rating: "16+", genres: "Экшен • Сёнэн" },
    { id: 8, title: "Великий из бродячих псов 6", ep: "Эпизод 2", meta: "2026 • Весна • ТВ", rating: "16+", genres: "Экшен • Мистика" },
    { id: 9, title: "Синий оркестр", ep: "Эпизод 10", meta: "2026 • Весна • ТВ", rating: "12+", genres: "Музыка • Драма" },
  ],
};

// ═════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════
export default function Home() {
  const [slide, setSlide] = useState(0);
  const [activeDay, setActiveDay] = useState("today");
  const [newEpisodes, setNewEpisodes] = useState<AnimePreview[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/anime`)
      .then((r) => r.json())
      .then((data: AnimePreview[]) => setNewEpisodes(data))
      .catch(() => {});
  }, []);

  const prevSlide = () => setSlide((s) => (s === 0 ? bannerSlides.length - 1 : s - 1));
  const nextSlide = () => setSlide((s) => (s === bannerSlides.length - 1 ? 0 : s + 1));

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
        <section className={`${styles.hero} ${styles.container}`}>
          <div
            className={styles.banner}
            style={{
              ...(bannerSlides[slide].image ? { backgroundImage: `url(${bannerSlides[slide].image})` } : {}),
              ...(bannerSlides[slide].borderColor ? { borderColor: bannerSlides[slide].borderColor } : {}),
            }}
          >
            <div className={styles.bannerOverlay} />
            <div className={styles.bannerSlide} key={slide}>
              <h2 className={styles.bannerTitle}>{bannerSlides[slide].title}</h2>
              {(bannerSlides[slide].season || bannerSlides[slide].year || bannerSlides[slide].rating) && (
                <div className={styles.bannerMeta}>
                  {bannerSlides[slide].season && <span>{bannerSlides[slide].season}</span>}
                  {bannerSlides[slide].year && <span>{bannerSlides[slide].year}</span>}
                  {bannerSlides[slide].rating && <span>{bannerSlides[slide].rating}</span>}
                </div>
              )}
              {bannerSlides[slide].genres && (
                <div className={styles.bannerGenres}>{bannerSlides[slide].genres}</div>
              )}
              <p className={styles.bannerText}>{bannerSlides[slide].text}</p>
              <div className={styles.bannerActions}>
                <button className={styles.bannerPlayBtn}>
                  <Play size={16} /> Смотреть
                </button>
                <button className={styles.bannerIconBtn} aria-label="В избранное">
                  <Star size={18} />
                </button>
                <button className={styles.bannerIconBtn} aria-label="В коллекцию">
                  <ListVideo size={18} />
                </button>
                <button className={styles.bannerIconBtn} aria-label="Ещё">
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>
            <div className={styles.bannerNav}>
              <button className={styles.bannerArrow} onClick={prevSlide} aria-label="Назад">
                <ChevronLeft size={18} />
              </button>
              {bannerSlides.map((_, i) => (
                <button
                  key={i}
                  className={i === slide ? styles.bannerDotActive : styles.bannerDot}
                  onClick={() => setSlide(i)}
                  aria-label={`Слайд ${i + 1}`}
                />
              ))}
              <button className={styles.bannerArrow} onClick={nextSlide} aria-label="Вперёд">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* ── New Episodes ── */}
        <section className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                Новые эпизоды <ArrowRight size={18} />
              </h2>
              <p className={styles.sectionSubtitle}>
                Самые новые и свежие эпизоды в любимой озвучке
              </p>
            </div>
            <div className={styles.scrollArrows}>
              <button className={styles.scrollArrow} onClick={() => { const el = document.getElementById('epRow'); if (el) el.scrollBy({ left: -300, behavior: 'smooth' }); }} aria-label="Назад">
                <ChevronLeft size={18} />
              </button>
              <button className={styles.scrollArrow} onClick={() => { const el = document.getElementById('epRow'); if (el) el.scrollBy({ left: 300, behavior: 'smooth' }); }} aria-label="Вперёд">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div id="epRow" className={styles.episodesRow}>
            {newEpisodes.map((ep) => (
              <Link key={ep.id} href={`/realeses/anime-page/${ep.id}`} className={styles.episodeCard}>

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
                    <span className={styles.episodePlayBtn} aria-label="Смотреть">
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
              <div className={styles.supportLabel}><Sparkles size={12} /> Поддержать проект</div>
              <h3 className={styles.supportTitle}>
                Вам нравится <span className={styles.supportTitleAccent}>Yumeko?</span>
              </h3>
              <p className={styles.supportText}>
                Помогите нам развиваться и делать лучше. Каждый вклад — это новый эпизод, новая озвучка и любовь команды.
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

        {/* ── Schedule ── */}
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
                  className={activeDay === d.key ? styles.scheduleTabActive : styles.scheduleTab}
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
              const tags = item.genres.split(" • ");
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
                    <div className={styles.scheduleItemTitle}>{item.title}</div>
                    <div className={styles.scheduleItemSub}>
                      <span style={{ color: accent }} className={styles.scheduleItemEp}>
                        {item.ep}
                      </span>
                      <span className={styles.scheduleItemMeta}>{item.meta}</span>
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
                      <span className={styles.scheduleItemTime}>{item.duration}</span>
                    )}
                    <button className={styles.scheduleItemList} aria-label="В список">
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

      </main>
    </>
  );
}

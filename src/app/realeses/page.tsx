"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Header from "@/components/Header/Header";
import { type AnimeDetails, isAnimeHidden } from "@/data/anime";
import { API_URL } from "@/config/hosts";
import styles from "./catalog.module.scss";

const PER_PAGE = 24;

type TypeFilter = "all" | "anime" | "films" | "cartoons" | "serials" | "hentai";
type SortFilter = "year-desc" | "year-asc" | "title-asc";

type SelectOption = {
  label: string;
  value: string;
};

type CustomSelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  direction?: "up" | "down";
};

type StudioDto = {
  name: string;
  isCollaboration?: boolean;
};


const CATEGORY_TABS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "anime", label: "Аниме" },
  { key: "films", label: "Фильмы" },
  { key: "cartoons", label: "Мультфильмы" },
  { key: "serials", label: "Сериалы" },
  { key: "hentai", label: "Хентай" },
];

const NON_GENRE_LABELS = new Set(
  ["Аниме", "Мультфильм", "Фильм", "Сериал", "Хентай", "ТВ", "OVA", "ONA", "Спешл"].map((item) =>
    item.toLowerCase(),
  ),
);

const SORT_OPTIONS: { value: SortFilter; label: string }[] = [

  { value: "year-desc", label: "Сначала новые" },
  { value: "year-asc", label: "Сначала старые" },
  { value: "title-asc", label: "По названию" },
];

function CustomSelect({ label, value, options, placeholder, onChange, direction = "up" }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className={styles.customSelect}>
      <button
        type="button"
        className={open ? styles.selectButtonOpen : styles.selectButton}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className={selected ? styles.selectValue : styles.selectPlaceholder}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className={open ? styles.selectChevronOpen : styles.selectChevron} />
      </button>

      {open && (
        <div
          className={direction === "up" ? styles.selectMenuUp : styles.selectMenu}
          role="listbox"
          aria-label={label}
        >
          <button
            type="button"
            className={!value ? styles.selectOptionActive : styles.selectOption}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value ? styles.selectOptionActive : styles.selectOption}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function splitValues(value?: string | null): string[] {
  return (value ?? "")
    .split(/[,•]/)
    .map((item) => item.trim())
    .filter(Boolean);
}


function parseYearValue(year?: string | null): number {
  const match = year?.match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ru"),
  );
}

function matchesType(anime: AnimeDetails, type: TypeFilter): boolean {
  if (type === "all") return true;

  const genres = splitValues(anime.genres);
  const format = anime.format?.trim() ?? "";

  const isCartoon = genres.includes("Мультфильм") || format === "Мультфильм";
  const isFilm = genres.includes("Фильм") || format === "Фильм";
  const isSerial = genres.includes("Сериал") || format === "Сериал";
  const isHentai = genres.includes("Хентай") || format === "Хентай";

  if (type === "cartoons") return isCartoon;
  if (type === "films") return isFilm && !isCartoon;
  if (type === "serials") return isSerial;
  if (type === "hentai") return isHentai;
  if (type === "anime") {
    if (isCartoon || isFilm || isSerial || isHentai) return false;
    return genres.includes("Аниме") || ["ТВ", "OVA", "ONA", "Спешл"].includes(format);
  }

  return true;
}

function sortAnime(list: AnimeDetails[], sort: SortFilter): AnimeDetails[] {
  return [...list].sort((left, right) => {
    if (sort === "title-asc") {
      return left.title.localeCompare(right.title, "ru");
    }

    const leftYear = parseYearValue(left.year);
    const rightYear = parseYearValue(right.year);

    if (leftYear !== rightYear) {
      return sort === "year-asc" ? leftYear - rightYear : rightYear - leftYear;
    }

    return left.title.localeCompare(right.title, "ru");
  });
}

export default function CatalogPage() {
  const [anime, setAnime] = useState<AnimeDetails[]>([]);
  const [studioMap, setStudioMap] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [studio, setStudio] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [format, setFormat] = useState("");
  const [season, setSeason] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortFilter>("year-desc");
  const [page, setPage] = useState(1);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      setLoading(true);
      setError("");

      try {
        const [animeResponse, voiceCastResponse, episodeResponse, studiosResponse] = await Promise.all([
          fetch(`${API_URL}/api/anime`),
          fetch(`${API_URL}/api/voice-cast/studio-map`),
          fetch(`${API_URL}/api/episodes/studio-map`),
          fetch(`${API_URL}/api/studios`),
        ]);

        if (!animeResponse.ok) {
          throw new Error(`Anime request failed with ${animeResponse.status}`);
        }

        const animeData = (await animeResponse.json()) as AnimeDetails[];
        const voiceCastMap = voiceCastResponse.ok
          ? ((await voiceCastResponse.json()) as Record<string, number[]>)
          : {};
        const episodeMap = episodeResponse.ok
          ? ((await episodeResponse.json()) as Record<string, number[]>)
          : {};
        const mergedStudios: Record<string, number[]> = { ...voiceCastMap };

        for (const [studioName, ids] of Object.entries(episodeMap)) {
          const existingIds = mergedStudios[studioName] || [];
          mergedStudios[studioName] = [...new Set([...existingIds, ...ids])].sort((a, b) => a - b);
        }

        if (studiosResponse.ok) {
          const studiosData = (await studiosResponse.json()) as StudioDto[];
          const activeStudios = new Set(
            studiosData.filter((item) => item.isCollaboration).map((item) => item.name),
          );
          activeStudios.add("YumekoStudio");

          for (const studioName of Object.keys(mergedStudios)) {
            if (!activeStudios.has(studioName)) {
              delete mergedStudios[studioName];
            }
          }
        }

        if (!active) return;

        setAnime(animeData.filter((item) => !isAnimeHidden(item)));
        setStudioMap(mergedStudios);
      } catch (loadError) {
        console.error("Failed to load releases catalog", loadError);
        if (!active) return;

        setAnime([]);
        setStudioMap({});
        setError("Не удалось загрузить каталог релизов. Попробуй обновить страницу немного позже.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  const studios = useMemo(
    () => uniqueSorted(Object.keys(studioMap)),
    [studioMap],
  );

  const genres = useMemo(() => {
    const seen = new Map<string, string>();
    for (const genreName of anime.flatMap((item) => splitValues(item.genres))) {
      const key = genreName.trim().toLowerCase();
      if (key && !NON_GENRE_LABELS.has(key) && !seen.has(key)) {
        seen.set(key, genreName.trim());
      }
    }

    return [...seen.values()].sort((a, b) => a.localeCompare(b, "ru"));
  }, [anime]);


  const years = useMemo(
    () =>
      [...new Set(anime.map((item) => parseYearValue(item.year)).filter(Boolean))]
        .sort((a, b) => b - a)
        .map(String),
    [anime],
  );

  const formats = useMemo(
    () => uniqueSorted(anime.map((item) => item.format ?? "")),
    [anime],
  );

  const filtered = useMemo(() => {

    const query = deferredSearch.trim().toLowerCase();

    const next = anime.filter((item) => {
      if (!matchesType(item, type)) return false;
      if (year && String(parseYearValue(item.year)) !== year) return false;
      if (format && item.format !== format) return false;
      if (season && item.season !== season) return false;
      if (status && item.status !== status) return false;
      if (genre && !splitValues(item.genres).includes(genre)) return false;

      if (studio) {
        const ids = studioMap[studio] ?? [];
        const matchesMappedStudio = ids.includes(item.id);
        const matchesPrimaryStudio = item.studio?.trim().toLowerCase() === studio.toLowerCase();

        if (!matchesMappedStudio && !matchesPrimaryStudio) return false;
      }

      if (query) {
        const haystack = [
          item.title,
          item.altTitle,
          item.genres,
          item.studio,
          item.year,
          item.season,
          item.format,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    return sortAnime(next, sort);
  }, [anime, deferredSearch, format, genre, season, sort, status, studio, studioMap, type, year]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const goToPage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((value) => {
    if (totalPages <= 7) return true;
    if (value === 1 || value === totalPages) return true;
    return Math.abs(value - currentPage) <= 1;
  });

  const activeFilters = [
    search.trim() ? `Поиск: ${search.trim()}` : null,
    type !== "all" ? `Тип: ${CATEGORY_TABS.find((item) => item.key === type)?.label}` : null,
    year ? `Год: ${year}` : null,
    genre ? `Жанр: ${genre}` : null,
    studio ? `Студия: ${studio}` : null,
    format ? `Формат: ${format}` : null,
    season ? `Сезон: ${season}` : null,
    status ? `Статус: ${status}` : null,
  ].filter(Boolean) as string[];

  const heroStats = [
    { label: "Тайтлов", value: String(anime.length) },
    { label: "Студий", value: String(studios.length) },
  ];


  const yearOptions = years.map((item) => ({ value: item, label: item }));
  const genreOptions = genres.map((item) => ({ value: item, label: item }));
  const studioOptions = studios.map((item) => ({ value: item, label: item }));
  const formatOptions = formats.map((item) => ({ value: item, label: item }));
  const sortOptions = SORT_OPTIONS.map((item) => ({ value: item.value, label: item.label }));


  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const updateType = (value: TypeFilter) => {
    setType(value);
    setPage(1);
  };

  const updateYear = (value: string) => {
    setYear(value);
    setPage(1);
  };

  const updateGenre = (value: string) => {
    setGenre(value);
    setPage(1);
  };

  const updateStudio = (value: string) => {
    setStudio(value);
    setPage(1);
  };

  const updateFormat = (value: string) => {
    setFormat(value);
    setPage(1);
  };

  const updateSort = (value: SortFilter) => {

    setSort(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setType("all");
    setStudio("");
    setGenre("");
    setYear("");
    setFormat("");
    setSeason("");
    setStatus("");
    setSort("year-desc");
    setPage(1);
  };

  const renderSkeletonGrid = () => (
    <div className={styles.grid}>
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <div className={styles.skeletonPoster} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonLineLg} />
            <div className={styles.skeletonLineMd} />
            <div className={styles.skeletonTags}>
              <span className={styles.skeletonTag} />
              <span className={styles.skeletonTag} />
              <span className={styles.skeletonTag} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>Релизы</h1>
            <p className={styles.heroSub}>
              Слева — гибкие фильтры по году, типу, жанру и студии. Справа — быстрый поиск,
              сортировка и красивая карточная выдача.
            </p>
          </div>

          <div className={styles.heroStats}>
            {heroStats.map((item) => (
              <div key={item.label} className={styles.statCard}>
                <span className={styles.statValue}>{item.value}</span>
                <span className={styles.statLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarSurface}>
              <div className={styles.sidebarHeader}>
                <div>
                  <span className={styles.sidebarEyebrow}>Каталог</span>
                  <div className={styles.sidebarTitleRow}>
                    <SlidersHorizontal size={18} />
                    <h2 className={styles.sidebarTitle}>Фильтры</h2>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={resetFilters}
                  disabled={activeFilters.length === 0}
                >
                  <RotateCcw size={14} />
                  Сбросить
                </button>
              </div>

              {loading ? (
                <div className={styles.sidebarSkeleton}>
                  <div className={styles.skeletonField} />
                  <div className={styles.skeletonField} />
                  <div className={styles.skeletonField} />
                  <div className={styles.skeletonField} />
                  <div className={styles.skeletonFieldLg} />
                </div>
              ) : (
                <div className={styles.filterStack}>
                  <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Тип</span>
                    <div className={styles.typeGrid}>
                      {CATEGORY_TABS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={type === item.key ? styles.typeChipActive : styles.typeChip}
                          onClick={() => updateType(item.key)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Год</span>
                    <CustomSelect
                      label="Год"
                      value={year}
                      options={yearOptions}
                      placeholder="Все годы"
                      onChange={updateYear}
                    />
                  </div>

                  <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Жанр</span>
                    <CustomSelect
                      label="Жанр"
                      value={genre}
                      options={genreOptions}
                      placeholder="Все жанры"
                      onChange={updateGenre}
                    />
                  </div>

                  <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Студия</span>
                    <CustomSelect
                      label="Студия"
                      value={studio}
                      options={studioOptions}
                      placeholder="Все студии"
                      onChange={updateStudio}
                    />
                  </div>

                  <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Формат</span>
                    <CustomSelect
                      label="Формат"
                      value={format}
                      options={formatOptions}
                      placeholder="Любой формат"
                      onChange={updateFormat}
                      direction="up"
                    />
                  </div>
                </div>

              )}
            </div>
          </aside>

          <section className={styles.content}>
            <div className={styles.contentPanel}>
              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <Search size={18} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    value={search}
                    onChange={(event) => updateSearch(event.target.value)}
                    placeholder="Найти аниме, жанр, студию или сезон..."
                  />
                  {search && (
                    <button
                      type="button"
                      className={styles.searchClear}
                      onClick={() => updateSearch("")}
                      aria-label="Очистить поиск"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className={styles.sortBox}>
                  <span className={styles.sortLabel}>Сортировка</span>
                  <CustomSelect
                    label="Сортировка"
                    value={sort}
                    options={sortOptions}
                    placeholder="Выбрать сортировку"
                    onChange={(value) => updateSort(value as SortFilter)}
                    direction="up"
                  />
                </div>
              </div>

              <div className={styles.resultsBar}>
                <div className={styles.resultPill}>
                  <Sparkles size={14} />
                  {loading
                    ? "Загружаем каталог..."
                    : deferredSearch !== search
                      ? "Обновляем выдачу..."
                      : `${filtered.length} релизов найдено`}
                </div>
                <span className={styles.resultMeta}>
                  Страница {currentPage} из {totalPages}
                </span>
              </div>

              {activeFilters.length > 0 && (
                <div className={styles.activeFilters}>
                  {activeFilters.map((item) => (
                    <span key={item} className={styles.activeFilterChip}>
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyTitle}>Каталог временно недоступен</h3>
                <p className={styles.emptyText}>{error}</p>
              </div>
            ) : loading ? (
              renderSkeletonGrid()
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyTitle}>Ничего не найдено</h3>
                <p className={styles.emptyText}>
                  Измени фильтры слева или очисти строку поиска, чтобы увидеть больше тайтлов.
                </p>
                <button type="button" className={styles.emptyButton} onClick={resetFilters}>
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {paged.map((item) => {
                    const genresText = splitValues(item.genres).slice(0, 3).join(" • ");

                    return (
                      <Link
                        key={item.id}
                        href={`/realeses/anime-page/${item.id}`}
                        className={styles.card}
                      >
                        <div className={styles.poster}>
                          <Image
                            src={item.poster}
                            alt={item.title}
                            fill
                            sizes="(max-width: 540px) 50vw, (max-width: 860px) 33vw, (max-width: 1180px) 25vw, 18vw"
                            className={styles.posterImg}
                          />
                          <div className={styles.posterShade} />
                          <span className={styles.formatBadge}>{item.format || "TV"}</span>
                          <span className={styles.ratingBadge}>★ {item.rating}</span>
                        </div>

                        <div className={styles.cardBody}>
                          <h3 className={styles.cardTitle}>{item.title}</h3>

                          <div className={styles.cardMetaRow}>
                            <span className={styles.episodesText}>{item.episodes || item.ep || "?"} эп.</span>
                            <span className={styles.yearBadge}>{item.year || "—"}</span>
                          </div>

                          <p className={styles.genreText}>{genresText || "Жанры не указаны"}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      className={styles.pageButton}
                      disabled={currentPage <= 1}
                      onClick={() => goToPage(currentPage - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {pageNumbers.map((item, index, array) => {
                      const showDots = index > 0 && item - array[index - 1] > 1;

                      return (
                        <span key={item} className={styles.paginationChunk}>
                          {showDots && <span className={styles.dots}>…</span>}
                          <button
                            type="button"
                            className={
                              item === currentPage ? styles.pageNumberActive : styles.pageNumber
                            }
                            onClick={() => goToPage(item)}
                          >
                            {item}
                          </button>
                        </span>
                      );
                    })}

                    <button
                      type="button"
                      className={styles.pageButton}
                      disabled={currentPage >= totalPages}
                      onClick={() => goToPage(currentPage + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header/Header";
import {
  ArrowLeft,
  Save,
  ImageIcon,
  X,
  Upload,
  Link2,
  Loader2,
  Check,
  Plus,
  Trash2,
  Mic,
} from "lucide-react";
import { API_URL } from "@/config/hosts";
import styles from "./createAnime.module.scss";

const EMPTY_ANIME = {
  title: "",
  altTitle: "",
  ep: "",
  meta: "",
  rating: "16+",
  genres: "",
  poster: "",
  synopsis: "",
  description: "",
  studio: "",
  season: "",
  year: "",
  format: "ТВ",
  episodes: "",
  duration: "24 мин",
  status: "Онгоинг",
  badges: [] as string[],
  relatedIds: [] as number[],
};

type AnimeForm = typeof EMPTY_ANIME;

export default function CreateAnimePage() {
  return (
    <Suspense>
      <CreateAnimeContent />
    </Suspense>
  );
}

const SEASONS = ["Зима", "Весна", "Лето", "Осень"];
const ANIME_FORMATS = ["ТВ", "OVA", "ONA", "Спешл"];
const OTHER_FORMATS = ["Сериал", "Фильм", "Мультфильм", "Дорама"];
const STATUSES = ["Онгоинг", "Выходит", "Завершён", "Анонс"];
const RATINGS = ["0+", "6+", "12+", "16+", "18+"];
const ALL_GENRES = [
  "Аниме",
  "Мультфильм",
  "Фильм",
  "Экшен",
  "Приключения",
  "Комедия",
  "Драма",
  "Фэнтези",
  "Хоррор",
  "Меха",
  "Музыка",
  "Мистика",
  "Романтика",
  "Фантастика",
  "Повседневность",
  "Спорт",
  "Триллер",
  "Сверхъестественное",
  "Исекай",
  "Школа",
  "Сёнен",
  "Сёдзё",
  "Детектив",
  "Психология",
  "Военное",
  "Этти",
  "Гарем",
  "Сериал",
  "Хентай",
];
const ALL_BADGES = [
  "Топ недели",
  "Новинка",
  "Популярное",
  "Рекомендуем",
  "Эксклюзив",
];

function ChipSelect({
  options,
  selected,
  onToggle,
  color,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  color?: string;
}) {
  return (
    <div className={styles.chipGroup}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`${styles.chip} ${active ? styles.chipActive : ""}`}
            style={
              active && color
                ? { borderColor: color, color, background: `${color}18` }
                : undefined
            }
            onClick={() => onToggle(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function PillSelect({
  options,
  value,
  onChange,
  colors,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  colors?: Record<string, string>;
}) {
  return (
    <div className={styles.pillGroup}>
      {options.map((opt) => {
        const active = value === opt;
        const c = colors?.[opt];
        return (
          <button
            key={opt}
            type="button"
            className={`${styles.pill} ${active ? styles.pillActive : ""}`}
            style={
              active && c
                ? { borderColor: c, color: c, background: `${c}18` }
                : undefined
            }
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

const RATING_COLORS: Record<string, string> = {
  "0+": "#22c55e",
  "6+": "#22c55e",
  "12+": "#2dd4bf",
  "16+": "#f97316",
  "18+": "#ef4444",
};

function CreateAnimeContent() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

  const [contentType, setContentType] = useState<"anime" | "other">("anime");
  const [form, setForm] = useState<AnimeForm>({ ...EMPTY_ANIME });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posterError, setPosterError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [posterUrlInput, setPosterUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voiceCast, setVoiceCast] = useState<
    {
      id: number;
      studio: string;
      actorName: string;
      actorUsername?: string;
      actorDisplayName?: string;
      actorHasAvatar?: boolean;
      actorRoleColor?: string;
      characterName: string;
    }[]
  >([]);
  const [vcStudio, setVcStudio] = useState("YumekoStudio");
  const [vcActor, setVcActor] = useState("");
  const [vcUsername, setVcUsername] = useState("");
  const [vcCharacter, setVcCharacter] = useState("");
  const [vcSaving, setVcSaving] = useState(false);

  useEffect(() => {
    const maxPri = Math.max(
      0,
      ...(auth.user?.roles ?? [auth.user?.role].filter(Boolean)).map(
        (r) => r?.priority ?? 0,
      ),
    );
    if (!auth.isAuthenticated || maxPri < 80) {
      router.replace("/");
      return;
    }
    if (isEdit) {
      fetch(`${API_URL}/api/voice-cast/${editId}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setVoiceCast(data))
        .catch(() => {});
      fetch(`${API_URL}/api/anime/${editId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            title: data.title || "",
            altTitle: data.altTitle || "",
            ep: data.ep || "",
            meta: data.meta || "",
            rating: data.rating || "16+",
            genres: data.genres || "",
            poster: data.poster || "",
            synopsis: data.synopsis || "",
            description: data.description || "",
            studio: data.studio || "",
            season: data.season || "",
            year: data.year || "",
            format: data.format || "ТВ",
            episodes: data.episodes || "",
            duration: data.duration || "",
            status: data.status || "",
            badges: data.badges || [],
            relatedIds: data.relatedIds || [],
          });
          setLoading(false);
        })
        .catch(() => {
          setError("Не удалось загрузить");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [auth, router, editId, isEdit]);

  const setField = (key: keyof AnimeForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "poster") setPosterError(false);
  };

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/anime/upload-poster`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        setField("poster", data.url);
      } else {
        setError(data.error || "Ошибка загрузки");
      }
    } catch {
      setError("Сетевая ошибка при загрузке");
    }
    setUploading(false);
  }, []);

  const uploadFromUrl = async () => {
    if (!posterUrlInput.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/anime/upload-poster-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: posterUrlInput.trim() }),
      });
      const data = await res.json();
      if (data.url) {
        setField("poster", data.url);
        setPosterUrlInput("");
      } else {
        setError(data.error || "Ошибка загрузки по URL");
      }
    } catch {
      setError("Сетевая ошибка");
    }
    setUploading(false);
  };

  const ALLOWED_POSTER_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
  ];

  const validateImageFile = (file: File): boolean => {
    if (!ALLOWED_POSTER_TYPES.includes(file.type)) {
      setError(
        "Не-не-не, только расширение картинок :) Допустимые форматы: JPG, PNG, WebP, BMP, SVG",
      );
      return false;
    }
    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!ALLOWED_POSTER_TYPES.includes(file.type)) {
        setError(
          "Не-не-не, только расширение картинок :) Допустимые форматы: JPG, PNG, WebP, BMP, SVG",
        );
        return;
      }
      uploadFile(file);
    },
    [uploadFile],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageFile(file)) uploadFile(file);
    e.target.value = "";
  };

  const toggleBadge = (b: string) => {
    const next = form.badges.includes(b)
      ? form.badges.filter((x) => x !== b)
      : [...form.badges, b];
    setForm((prev) => ({ ...prev, badges: next }));
  };

  const handleSave = async () => {
    const errors: string[] = [];
    if (!form.title.trim()) errors.push("Название");
    if (!form.poster.trim()) errors.push("Постер");
    if (!form.format.trim()) errors.push("Формат");
    if (!form.status.trim()) errors.push("Статус");
    if (errors.length) {
      setError(`Заполните обязательные поля: ${errors.join(", ")}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = isEdit
        ? `${API_URL}/api/anime/${editId}`
        : `${API_URL}/api/anime`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        // creatorUserId — для начисления XP при создании нового аниме
        body: JSON.stringify({
          ...form,
          ...(!isEdit && auth.user ? { creatorUserId: auth.user.id } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Ошибка сохранения");
        setSaving(false);
        return;
      }
      setSaving(false);
      setSaved(true);
      setTimeout(() => router.push("/admin"), 500);
      return;
    } catch {
      setError("Сетевая ошибка");
    }
    setSaving(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) =>
    String(currentYear + 1 - i),
  );

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.page}>
          <div className={styles.container}>
            <p style={{ color: "var(--text-secondary)" }}>Загрузка...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div
          className={`${styles.container} ${saved ? styles.containerOut : ""}`}
        >
          <div className={styles.topBar}>
            <button
              className={styles.backBtn}
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft size={16} /> Назад
            </button>
            <h1 className={styles.pageTitle}>
              {isEdit
                ? "Редактировать"
                : contentType === "anime"
                  ? "Новое аниме"
                  : "Новый контент"}
            </h1>
            <div className={styles.topBarRight}>
              <button
                className={styles.cancelBtn}
                onClick={() => router.push("/admin")}
              >
                Отмена
              </button>
              <button
                className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ""}`}
                onClick={handleSave}
                disabled={saving || saved}
              >
                {saved ? (
                  <>
                    <Check size={14} /> Сохранено
                  </>
                ) : saving ? (
                  <>
                    <Loader2 size={14} className={styles.saveSpin} />{" "}
                    Сохраняю...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Сохранить
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorBar}>
              {error}
              <button onClick={() => setError(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Переключатель типа контента */}
          {!isEdit && (
            <div className={styles.contentTypeSwitch}>
              <button
                type="button"
                className={`${styles.contentTypeBtn} ${contentType === "anime" ? styles.contentTypeBtnActive : ""}`}
                onClick={() => {
                  setContentType("anime");
                  setField("format", "ТВ");
                }}
              >
                Аниме
              </button>
              <button
                type="button"
                className={`${styles.contentTypeBtn} ${contentType === "other" ? styles.contentTypeBtnActive : ""}`}
                onClick={() => {
                  setContentType("other");
                  setField("format", "Сериал");
                }}
              >
                Кино и сериалы
              </button>
            </div>
          )}

          <div className={styles.layout}>
            {/* Left: poster */}
            <div className={styles.posterCol}>
              <div
                className={`${styles.posterCard} ${dragOver ? styles.posterCardDragOver : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !form.poster && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className={styles.posterPlaceholder}>
                    <Loader2 size={28} className={styles.spin} />
                    <span>Загрузка...</span>
                  </div>
                ) : form.poster && !posterError ? (
                  <img
                    src={form.poster}
                    alt="Постер"
                    className={styles.posterImg}
                    onError={() => setPosterError(true)}
                  />
                ) : (
                  <div className={styles.posterPlaceholder}>
                    <Upload size={28} />
                    <span>Перетащите или нажмите</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp,image/svg+xml"
                hidden
                onChange={handleFileSelect}
              />

              {form.poster && (
                <button
                  className={styles.posterChangeBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} /> Заменить файл
                </button>
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Или вставьте URL</label>
                <div className={styles.urlRow}>
                  <input
                    className={styles.fieldInput}
                    value={posterUrlInput}
                    onChange={(e) => setPosterUrlInput(e.target.value)}
                    placeholder="https://..."
                    onKeyDown={(e) => e.key === "Enter" && uploadFromUrl()}
                  />
                  <button
                    className={styles.urlBtn}
                    onClick={uploadFromUrl}
                    disabled={uploading || !posterUrlInput.trim()}
                  >
                    <Link2 size={14} />
                  </button>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Рейтинг</label>
                <PillSelect
                  options={RATINGS}
                  value={form.rating}
                  onChange={(v) => setField("rating", v)}
                  colors={RATING_COLORS}
                />
              </div>
            </div>

            {/* Right: fields */}
            <div className={styles.fieldsCol}>
              {/* Section: основное */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Основное</h3>
                <div className={styles.row2}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Название *</label>
                    <input
                      className={styles.fieldInput}
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      placeholder={contentType === "anime" ? "Магическая битва" : "Во все тяжкие"}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Альт. название</label>
                    <input
                      className={styles.fieldInput}
                      value={form.altTitle}
                      onChange={(e) => setField("altTitle", e.target.value)}
                      placeholder={contentType === "anime" ? "Jujutsu Kaisen" : "Breaking Bad"}
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Студия</label>
                  <input
                    className={styles.fieldInput}
                    value={form.studio}
                    onChange={(e) => setField("studio", e.target.value)}
                    placeholder={contentType === "anime" ? "MAPPA" : "Netflix"}
                  />
                </div>
              </section>

              {/* Section: параметры */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Параметры</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Формат</label>
                  <PillSelect
                    options={contentType === "anime" ? ANIME_FORMATS : OTHER_FORMATS}
                    value={form.format}
                    onChange={(v) => setField("format", v)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Статус</label>
                  <PillSelect
                    options={STATUSES}
                    value={form.status}
                    onChange={(v) => setField("status", v)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Сезон</label>
                  <PillSelect
                    options={SEASONS}
                    value={form.season}
                    onChange={(v) => setField("season", v)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Год</label>
                  <input
                    className={styles.fieldInput}
                    value={form.year}
                    onChange={(e) => setField("year", e.target.value)}
                    placeholder="2024"
                    maxLength={4}
                    style={{ maxWidth: 120 }}
                  />
                </div>
                <div className={styles.row2}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Эпизоды</label>
                    <input
                      className={styles.fieldInput}
                      value={form.episodes}
                      onChange={(e) => setField("episodes", e.target.value)}
                      placeholder="24"
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Длительность</label>
                    <input
                      className={styles.fieldInput}
                      value={form.duration}
                      onChange={(e) => setField("duration", e.target.value)}
                      placeholder="24 мин"
                    />
                  </div>
                </div>
              </section>

              {/* Section: жанры */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Жанры</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Через запятую</label>
                  <input
                    className={styles.fieldInput}
                    value={form.genres}
                    onChange={(e) => setField("genres", e.target.value)}
                    placeholder="Экшен, Фэнтези, Драма"
                  />
                </div>
              </section>

              {/* Section: описание */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Описание</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Описание</label>
                  <textarea
                    className={styles.fieldTextarea}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={4}
                    placeholder="Описание аниме..."
                  />
                </div>
              </section>

              {/* Section: озвучка */}
              {isEdit && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <Mic
                      size={16}
                      style={{ marginRight: 6, verticalAlign: -2 }}
                    />
                    Работа над релизом
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                      gap: 12,
                    }}
                  >
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>
                        Студия озвучки
                      </label>
                      <input
                        className={styles.fieldInput}
                        value={vcStudio}
                        onChange={(e) => setVcStudio(e.target.value)}
                        placeholder="YumekoStudio"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>
                        Профиль (@username)
                      </label>
                      <input
                        className={styles.fieldInput}
                        value={vcUsername}
                        onChange={(e) =>
                          setVcUsername(e.target.value.replace("@", ""))
                        }
                        placeholder="username"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Имя актёра</label>
                      <input
                        className={styles.fieldInput}
                        value={vcActor}
                        onChange={(e) => setVcActor(e.target.value)}
                        placeholder="Hirst"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Персонаж</label>
                      <input
                        className={styles.fieldInput}
                        value={vcCharacter}
                        onChange={(e) => setVcCharacter(e.target.value)}
                        placeholder="Ко Ямори"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (
                              !vcActor.trim() ||
                              !vcCharacter.trim() ||
                              !vcStudio.trim()
                            )
                              return;
                            setVcSaving(true);
                            fetch(`${API_URL}/api/voice-cast`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                animeId: Number(editId),
                                studio: vcStudio.trim(),
                                actorName: vcActor.trim(),
                                actorUsername: vcUsername.trim() || null,
                                characterName: vcCharacter.trim(),
                              }),
                            })
                              .then((r) => (r.ok ? r.json() : null))
                              .then(() => {
                                setVcActor("");
                                setVcCharacter("");
                                setVcUsername("");
                                fetch(`${API_URL}/api/voice-cast/${editId}`)
                                  .then((r) => (r.ok ? r.json() : []))
                                  .then((data) => setVoiceCast(data))
                                  .catch(() => {});
                              })
                              .catch(() => {})
                              .finally(() => setVcSaving(false));
                          }
                        }}
                      />
                    </div>
                    <div
                      className={styles.fieldGroup}
                      style={{ display: "flex", alignItems: "flex-end" }}
                    >
                      <button
                        className={styles.urlBtn}
                        disabled={
                          vcSaving || !vcActor.trim() || !vcCharacter.trim()
                        }
                        style={{ height: 36, width: 36 }}
                        onClick={() => {
                          if (
                            !vcActor.trim() ||
                            !vcCharacter.trim() ||
                            !vcStudio.trim()
                          )
                            return;
                          setVcSaving(true);
                          fetch(`${API_URL}/api/voice-cast`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              animeId: Number(editId),
                              studio: vcStudio.trim(),
                              actorName: vcActor.trim(),
                              actorUsername: vcUsername.trim() || null,
                              characterName: vcCharacter.trim(),
                            }),
                          })
                            .then((r) => (r.ok ? r.json() : null))
                            .then(() => {
                              setVcActor("");
                              setVcCharacter("");
                              setVcUsername("");
                              fetch(`${API_URL}/api/voice-cast/${editId}`)
                                .then((r) => (r.ok ? r.json() : []))
                                .then((data) => setVoiceCast(data))
                                .catch(() => {});
                            })
                            .catch(() => {})
                            .finally(() => setVcSaving(false));
                        }}
                      >
                        {vcSaving ? (
                          <Loader2 size={14} className={styles.saveSpin} />
                        ) : (
                          <Plus size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  {voiceCast.length > 0 &&
                    (() => {
                      const studios = [
                        ...new Set(voiceCast.map((vc) => vc.studio)),
                      ].sort();
                      return studios.map((studio) => {
                        const items = voiceCast.filter(
                          (vc) => vc.studio === studio,
                        );
                        return (
                          <div key={studio} style={{ marginTop: 12 }}>
                            <p
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                marginBottom: 6,
                              }}
                            >
                              {studio}
                            </p>
                            {items.map((vc) => (
                              <div
                                key={vc.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "8px 0",
                                  borderBottom:
                                    "1px solid rgba(255,255,255,0.04)",
                                }}
                              >
                                {vc.actorUsername && vc.actorHasAvatar ? (
                                  <img
                                    src={`${API_URL}/api/media/${vc.actorUsername}/avatar`}
                                    alt=""
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      objectFit: "cover",
                                      border: vc.actorRoleColor
                                        ? `2px solid ${vc.actorRoleColor}`
                                        : "2px solid rgba(255,255,255,0.1)",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      background: "rgba(255,255,255,0.06)",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        fontSize: 13,
                                        color:
                                          vc.actorRoleColor ||
                                          "var(--text-primary)",
                                      }}
                                    >
                                      {vc.actorDisplayName || vc.actorName}
                                    </span>
                                    {vc.actorUsername && (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          color: "var(--text-muted)",
                                        }}
                                      >
                                        @{vc.actorUsername}
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {"\u2192"} {vc.characterName}
                                  </span>
                                </div>
                                <button
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    padding: 4,
                                  }}
                                  onClick={() => {
                                    fetch(
                                      `${API_URL}/api/voice-cast/${vc.id}`,
                                      { method: "DELETE" },
                                    )
                                      .then(() =>
                                        setVoiceCast((prev) =>
                                          prev.filter((v) => v.id !== vc.id),
                                        ),
                                      )
                                      .catch(() => {});
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                </section>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

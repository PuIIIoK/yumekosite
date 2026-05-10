"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header/Header";
import { ArrowLeft, Save, ImageIcon, X, Upload, Link2, Loader2, Check } from "lucide-react";
import { API_URL } from "@/config/hosts";
import styles from "./createAnime.module.scss";

const EMPTY_ANIME = {
  title: "", altTitle: "", ep: "", meta: "", rating: "16+", genres: "",
  poster: "", synopsis: "", description: "", studio: "", season: "",
  year: "", format: "ТВ", episodes: "", duration: "24 мин", status: "Онгоинг",
  badges: [] as string[], relatedIds: [] as number[], anilibriaAlias: "",
};

type AnimeForm = typeof EMPTY_ANIME;

export default function CreateAnimePage() {
  return <Suspense><CreateAnimeContent /></Suspense>;
}

const SEASONS = ["Зима", "Весна", "Лето", "Осень"];
const FORMATS = ["ТВ", "Фильм", "OVA", "ONA", "Спешл"];
const STATUSES = ["Онгоинг", "Выходит", "Завершён", "Анонс"];
const RATINGS = ["0+", "6+", "12+", "16+", "18+"];
const ALL_GENRES = [
  "Экшен", "Приключения", "Комедия", "Драма", "Фэнтези", "Хоррор",
  "Меха", "Музыка", "Мистика", "Романтика", "Фантастика", "Повседневность",
  "Спорт", "Триллер", "Сверхъестественное", "Исекай", "Школа", "Сёнен",
  "Сёдзё", "Детектив", "Психология", "Военное", "Этти", "Гарем",
];
const ALL_BADGES = ["Топ недели", "Новинка", "Популярное", "Рекомендуем", "Эксклюзив"];

function ChipSelect({ options, selected, onToggle, color }: {
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
            style={active && color ? { borderColor: color, color, background: `${color}18` } : undefined}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function PillSelect({ options, value, onChange, colors }: {
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
            style={active && c ? { borderColor: c, color: c, background: `${c}18` } : undefined}
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
  "0+": "#22c55e", "6+": "#22c55e", "12+": "#2dd4bf", "16+": "#f97316", "18+": "#ef4444",
};

function CreateAnimeContent() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

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

  useEffect(() => {
    const maxPri = Math.max(0, ...(auth.user?.roles ?? [auth.user?.role].filter(Boolean)).map((r) => r?.priority ?? 0));
    if (!auth.isAuthenticated || maxPri < 80) {
      router.replace("/");
      return;
    }
    if (isEdit) {
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
            anilibriaAlias: data.anilibriaAlias || "",
          });
          setLoading(false);
        })
        .catch(() => { setError("Не удалось загрузить"); setLoading(false); });
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
      const res = await fetch(`${API_URL}/api/anime/upload-poster`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setField("poster", data.url);
      } else {
        setError(data.error || "Ошибка загрузки");
      }
    } catch { setError("Сетевая ошибка при загрузке"); }
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
    } catch { setError("Сетевая ошибка"); }
    setUploading(false);
  };

  const ALLOWED_POSTER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/svg+xml"];

  const validateImageFile = (file: File): boolean => {
    if (!ALLOWED_POSTER_TYPES.includes(file.type)) {
      setError("Не-не-не, только расширение картинок :) Допустимые форматы: JPG, PNG, WebP, BMP, SVG");
      return false;
    }
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!ALLOWED_POSTER_TYPES.includes(file.type)) {
      setError("Не-не-не, только расширение картинок :) Допустимые форматы: JPG, PNG, WebP, BMP, SVG");
      return;
    }
    uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageFile(file)) uploadFile(file);
    e.target.value = "";
  };

  const toggleGenre = (g: string) => {
    const list = form.genres ? form.genres.split(" • ") : [];
    const next = list.includes(g) ? list.filter((x) => x !== g) : [...list, g];
    setField("genres", next.join(" • "));
  };

  const toggleBadge = (b: string) => {
    const next = form.badges.includes(b) ? form.badges.filter((x) => x !== b) : [...form.badges, b];
    setForm((prev) => ({ ...prev, badges: next }));
  };

  const selectedGenres = form.genres ? form.genres.split(" • ").filter(Boolean) : [];

  const handleSave = async () => {
    const errors: string[] = [];
    if (!form.title.trim()) errors.push("Название");
    if (!form.poster.trim()) errors.push("Постер");
    if (!form.format.trim()) errors.push("Формат");
    if (!form.status.trim()) errors.push("Статус");
    if (errors.length) { setError(`Заполните обязательные поля: ${errors.join(", ")}`); return; }
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `${API_URL}/api/anime/${editId}` : `${API_URL}/api/anime`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    } catch { setError("Сетевая ошибка"); }
    setSaving(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear + 1 - i));

  if (loading) {
    return (<><Header /><main className={styles.page}><div className={styles.container}><p style={{ color: "var(--text-secondary)" }}>Загрузка...</p></div></main></>);
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={`${styles.container} ${saved ? styles.containerOut : ""}`}>
          <div className={styles.topBar}>
            <button className={styles.backBtn} onClick={() => router.push("/admin")}>
              <ArrowLeft size={16} /> Назад
            </button>
            <h1 className={styles.pageTitle}>{isEdit ? "Редактировать" : "Новое аниме"}</h1>
            <div className={styles.topBarRight}>
              <button className={styles.cancelBtn} onClick={() => router.push("/admin")}>Отмена</button>
              <button className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ""}`} onClick={handleSave} disabled={saving || saved}>
                {saved ? <><Check size={14} /> Сохранено</> : saving ? <><Loader2 size={14} className={styles.saveSpin} /> Сохраняю...</> : <><Save size={14} /> Сохранить</>}
              </button>
            </div>
          </div>

          {error && <div className={styles.errorBar}>{error}<button onClick={() => setError(null)}><X size={14} /></button></div>}

          <div className={styles.layout}>
            {/* Left: poster */}
            <div className={styles.posterCol}>
              <div
                className={`${styles.posterCard} ${dragOver ? styles.posterCardDragOver : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
                  <img src={form.poster} alt="Постер" className={styles.posterImg} onError={() => setPosterError(true)} />
                ) : (
                  <div className={styles.posterPlaceholder}>
                    <Upload size={28} />
                    <span>Перетащите или нажмите</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/bmp,image/svg+xml" hidden onChange={handleFileSelect} />

              {form.poster && (
                <button className={styles.posterChangeBtn} onClick={() => fileInputRef.current?.click()}>
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
                  <button className={styles.urlBtn} onClick={uploadFromUrl} disabled={uploading || !posterUrlInput.trim()}>
                    <Link2 size={14} />
                  </button>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Рейтинг</label>
                <PillSelect options={RATINGS} value={form.rating} onChange={(v) => setField("rating", v)} colors={RATING_COLORS} />
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
                    <input className={styles.fieldInput} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Магическая битва" />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Альт. название</label>
                    <input className={styles.fieldInput} value={form.altTitle} onChange={(e) => setField("altTitle", e.target.value)} placeholder="Jujutsu Kaisen" />
                  </div>
                </div>
                <div className={styles.row2}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Студия</label>
                    <input className={styles.fieldInput} value={form.studio} onChange={(e) => setField("studio", e.target.value)} placeholder="MAPPA" />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>AniLibria Alias</label>
                    <input className={styles.fieldInput} value={form.anilibriaAlias} onChange={(e) => setField("anilibriaAlias", e.target.value)} placeholder="jujutsu-kaisen" />
                  </div>
                </div>
              </section>

              {/* Section: параметры */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Параметры</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Формат</label>
                  <PillSelect options={FORMATS} value={form.format} onChange={(v) => setField("format", v)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Статус</label>
                  <PillSelect options={STATUSES} value={form.status} onChange={(v) => setField("status", v)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Сезон</label>
                  <PillSelect options={SEASONS} value={form.season} onChange={(v) => setField("season", v)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Год</label>
                  <PillSelect options={years} value={form.year} onChange={(v) => setField("year", v)} />
                </div>
                <div className={styles.row3}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Эпизоды</label>
                    <input className={styles.fieldInput} value={form.episodes} onChange={(e) => setField("episodes", e.target.value)} placeholder="24" />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Текущий эпизод</label>
                    <input className={styles.fieldInput} value={form.ep} onChange={(e) => setField("ep", e.target.value)} placeholder="Эпизод 12" />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Длительность</label>
                    <input className={styles.fieldInput} value={form.duration} onChange={(e) => setField("duration", e.target.value)} placeholder="24 мин" />
                  </div>
                </div>
              </section>

              {/* Section: жанры */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Жанры</h3>
                <ChipSelect options={ALL_GENRES} selected={selectedGenres} onToggle={toggleGenre} color="var(--accent)" />
              </section>

              {/* Section: описание */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Описание</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Описание</label>
                  <textarea className={styles.fieldTextarea} value={form.description} onChange={(e) => setField("description", e.target.value)} rows={4} placeholder="Описание аниме..." />
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

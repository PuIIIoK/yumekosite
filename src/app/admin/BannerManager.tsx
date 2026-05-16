"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { API_URL } from "@/config/hosts";
import styles from "./admin.module.scss";

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

type SlideFormData = Omit<BannerSlide, "id">;

const emptyForm = (): SlideFormData => ({
  title: "",
  season: "",
  year: "",
  rating: "",
  genres: "",
  text: "",
  image: "",
  borderColor: "rgba(255,255,255,0.3)",
  buttonLink: "",
  buttonLabel: "Смотреть",
  sortOrder: 0,
  active: true,
  type: "anime",
  animeId: null,
  badge: "",
});

export default function BannerManager() {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSlide, setEditingSlide] = useState<BannerSlide | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BannerSlide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState<SlideFormData>(emptyForm());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/banners/all`);
      const data = await res.json();
      setSlides(data);
    } catch {
      setError("Не удалось загрузить слайды");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const openNewForm = () => {
    setFormData(emptyForm());
    setEditingSlide(null);
    setShowForm(true);
  };

  const openEditForm = (slide: BannerSlide) => {
    const { id: _id, ...rest } = slide;
    setFormData(rest);
    setEditingSlide(slide);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSlide(null);
  };

  const handleField = (
    field: keyof SlideFormData,
    value: string | boolean | number | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingSlide) {
        await fetch(`${API_URL}/api/banners/${editingSlide.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch(`${API_URL}/api/banners`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      closeForm();
      await fetchSlides();
    } catch {
      setError("Ошибка сохранения");
    }
    setSaving(false);
  };

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/banners/upload-image`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      handleField("image", data.url);
    } catch {
      setError("Ошибка загрузки изображения");
    }
    setImageUploading(false);
  };

  const sorted = [...slides].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleReorder = async (slide: BannerSlide, dir: "up" | "down") => {
    const idx = sorted.findIndex((s) => s.id === slide.id);
    const neighborIdx = dir === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= sorted.length) return;
    const neighbor = sorted[neighborIdx];

    await Promise.all([
      fetch(`${API_URL}/api/banners/${slide.id}/sort`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: neighbor.sortOrder }),
      }),
      fetch(`${API_URL}/api/banners/${neighbor.id}/sort`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: slide.sortOrder }),
      }),
    ]);

    await fetchSlides();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/api/banners/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      await fetchSlides();
    } catch {
      setError("Ошибка удаления");
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className={styles.contentPlaceholder}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.animeManager}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className={styles.animeManagerHeader}>
        <h2 className={styles.animeManagerTitle}>Управление баннером</h2>
        <button className={styles.animeAddBtn} onClick={openNewForm}>
          <Plus size={16} /> Добавить слайд
        </button>
      </div>

      {error && <div className={styles.animeError}>{error}</div>}

      {/* ── Form Panel ─────────────────────────────────────── */}
      {showForm && (
        <div className={styles.animeForm}>
          <div className={styles.animeFormHeader}>
            <h3>{editingSlide ? "Редактировать слайд" : "Новый слайд"}</h3>
            <button className={styles.animeFormClose} onClick={closeForm}>
              <X size={16} />
            </button>
          </div>

          <div
            className={styles.animeFormGrid}
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {/* Row 1: title / season / year */}
            <div className={styles.animeFormGroup}>
              <label>Название</label>
              <input
                value={formData.title}
                onChange={(e) => handleField("title", e.target.value)}
                placeholder="Название аниме"
              />
            </div>
            <div className={styles.animeFormGroup}>
              <label>Сезон</label>
              <input
                value={formData.season}
                onChange={(e) => handleField("season", e.target.value)}
                placeholder="Лето"
              />
            </div>
            <div className={styles.animeFormGroup}>
              <label>Год</label>
              <input
                value={formData.year}
                onChange={(e) => handleField("year", e.target.value)}
                placeholder="2025"
              />
            </div>

            {/* Row 2: rating / genres / borderColor */}
            <div className={styles.animeFormGroup}>
              <label>Рейтинг</label>
              <input
                value={formData.rating}
                onChange={(e) => handleField("rating", e.target.value)}
                placeholder="16+"
              />
            </div>
            <div className={styles.animeFormGroup}>
              <label>Жанры</label>
              <input
                value={formData.genres}
                onChange={(e) => handleField("genres", e.target.value)}
                placeholder="Экшен, Фэнтези"
              />
            </div>
            <div className={styles.animeFormGroup}>
              <label>Цвет рамки</label>
              <div className={styles.bannerColorRow}>
                <input
                  type="color"
                  value={
                    formData.borderColor.startsWith("#")
                      ? formData.borderColor
                      : "#ffffff"
                  }
                  onChange={(e) => handleField("borderColor", e.target.value)}
                />
                <input
                  value={formData.borderColor}
                  onChange={(e) => handleField("borderColor", e.target.value)}
                  placeholder="rgba(255,255,255,0.3)"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Row 3: buttonLink (2 cols) / buttonLabel */}
            <div
              className={styles.animeFormGroup}
              style={{ gridColumn: "span 2" }}
            >
              <label>Ссылка кнопки</label>
              <input
                value={formData.buttonLink}
                onChange={(e) => handleField("buttonLink", e.target.value)}
                placeholder="/anime/123"
              />
            </div>
            <div className={styles.animeFormGroup}>
              <label>Подпись кнопки</label>
              <input
                value={formData.buttonLabel}
                onChange={(e) => handleField("buttonLabel", e.target.value)}
                placeholder="Смотреть"
              />
            </div>

            {/* Full-width: description */}
            <div
              className={styles.animeFormGroup}
              style={{ gridColumn: "1 / -1" }}
            >
              <label>Описание</label>
              <textarea
                value={formData.text}
                onChange={(e) => handleField("text", e.target.value)}
                placeholder="Краткое описание для баннера..."
                rows={3}
              />
            </div>

            {/* Full-width: image */}
            <div
              className={styles.animeFormGroup}
              style={{ gridColumn: "1 / -1" }}
            >
              <label>Фоновое изображение</label>
              <div className={styles.bannerImageRow}>
                <div
                  className={`${styles.animeFormGroup} ${styles.bannerImageInput}`}
                  style={{ margin: 0 }}
                >
                  <input
                    value={formData.image}
                    onChange={(e) => handleField("image", e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <button
                  className={styles.bannerUploadBtn}
                  disabled={imageUploading}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {imageUploading ? (
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Upload size={14} />
                  )}
                  Загрузить файл
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
              {formData.image && (
                <img
                  src={formData.image}
                  alt=""
                  style={{
                    width: "100%",
                    maxHeight: 120,
                    objectFit: "cover",
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                />
              )}
            </div>
          </div>

          {/* Type / AnimeId / Badge */}
          <div
            className={styles.animeFormGrid}
            style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 8 }}
          >
            <div className={styles.animeFormGroup}>
              <label>Type</label>
              <select
                value={formData.type || "anime"}
                onChange={(e) => handleField("type", e.target.value)}
              >
                <option value="anime">Аниме</option>
                <option value="promo">Промо / Реклама</option>
              </select>
            </div>
            <div className={styles.animeFormGroup}>
              <label>ID аниме</label>
              <input
                type="number"
                value={formData.animeId ?? ""}
                onChange={(e) =>
                  handleField(
                    "animeId" as keyof SlideFormData,
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                placeholder="123"
              />
            </div>
            <div className={styles.animeFormGroup}>
              <label>Бейдж (promo)</label>
              <input
                value={formData.badge || ""}
                onChange={(e) => handleField("badge", e.target.value)}
                placeholder="Поддержите нас"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className={styles.bannerToggleRow}>
            <label className={styles.bannerToggle}>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => handleField("active", e.target.checked)}
              />
              <span className={styles.bannerToggleSlider} />
            </label>
            <span className={styles.bannerToggleLabel}>Показывать слайд</span>
          </div>

          {/* Form actions */}
          <div className={styles.animeFormActions}>
            <button
              className={styles.animeSaveBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2
                    size={14}
                    style={{ animation: "spin 1s linear infinite" }}
                  />{" "}
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </button>
            <button className={styles.animeCancelBtn} onClick={closeForm}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* ── Slides List ────────────────────────────────────── */}
      <div className={styles.bannerSlideList}>
        {sorted.map((slide, idx) => (
          <div key={slide.id} className={styles.bannerSlideCard}>
            {/* Thumbnail */}
            <div className={styles.bannerSlidePoster}>
              {slide.image ? (
                <img
                  src={slide.image}
                  alt=""
                  className={styles.bannerSlidePosterImg}
                />
              ) : (
                <div className={styles.bannerSlidePosterEmpty}>
                  <ImageIcon size={18} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className={styles.bannerSlideInfo}>
              <div className={styles.bannerSlideTitle}>
                {slide.title || "Без названия"}
              </div>
              <div className={styles.bannerSlideMeta}>
                {[slide.season, slide.year, slide.rating]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <span
                className={`${styles.bannerSlideBadge} ${
                  slide.active
                    ? styles.bannerSlideBadgeActive
                    : styles.bannerSlideBadgeHidden
                }`}
              >
                {slide.active ? (
                  <>
                    <Eye size={10} /> Активен
                  </>
                ) : (
                  <>
                    <EyeOff size={10} /> Скрыт
                  </>
                )}
              </span>
            </div>

            {/* Actions */}
            <div className={styles.bannerSlideActions}>
              <button
                className={styles.bannerOrderBtn}
                disabled={idx === 0}
                onClick={() => handleReorder(slide, "up")}
                title="Переместить вверх"
              >
                <ChevronUp size={14} />
              </button>
              <button
                className={styles.bannerOrderBtn}
                disabled={idx === sorted.length - 1}
                onClick={() => handleReorder(slide, "down")}
                title="Переместить вниз"
              >
                <ChevronDown size={14} />
              </button>
              <button
                className={styles.bannerEditBtn}
                onClick={() => openEditForm(slide)}
              >
                <Pencil size={13} /> Изменить
              </button>
              <button
                className={styles.bannerDeleteBtn}
                onClick={() => setDeleteTarget(slide)}
              >
                <Trash2 size={13} /> Удалить
              </button>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className={styles.animeTableEmpty}>
            Нет слайдов. Нажмите «Добавить слайд» чтобы создать первый.
          </div>
        )}
      </div>

      {/* ── Delete Modal ───────────────────────────────────── */}
      {deleteTarget && (
        <div
          className={styles.deleteOverlay}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className={styles.deleteModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.deleteModalClose}
              onClick={() => setDeleteTarget(null)}
            >
              <X size={16} />
            </button>
            <div className={styles.deleteModalIcon}>
              <AlertTriangle size={32} />
            </div>
            <h3 className={styles.deleteModalTitle}>Удалить слайд?</h3>
            <p className={styles.deleteModalText}>
              <strong>{deleteTarget.title || "Без названия"}</strong> будет
              удалён без возможности восстановления.
            </p>
            <div className={styles.deleteModalActions}>
              <button
                className={styles.deleteModalCancel}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className={styles.deleteModalConfirm}
                onClick={confirmDelete}
                disabled={deleting}
              >
                <Trash2 size={13} /> {deleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

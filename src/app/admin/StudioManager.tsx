"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Link2,
  Mail,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { API_URL } from "@/config/hosts";
import ImageUploadField from "@/components/ImageUploadField/ImageUploadField";
import styles from "./studioManager.module.scss";


interface Studio {
  id: number;
  name: string;
  description: string | null;
  headUsername: string | null;
  avatar: string | null;
  banner: string | null;
  socials: string | null;
  contact: string | null;
  website?: string | null;
  isCollaboration: boolean;
}

interface StudioFormState {
  name: string;
  description: string;
  headUsername: string;
  avatar: string;
  banner: string;
  socials: string;
  contact: string;
  isCollaboration: boolean;
}

interface SocialLinkRow {
  id: string;
  label: string;
  url: string;
}

const createEmptyForm = (): StudioFormState => ({
  name: "",
  description: "",
  headUsername: "",
  avatar: "",
  banner: "",
  socials: "",
  contact: "",
  isCollaboration: true,
});

const splitLines = (value: string | null | undefined) =>
  value
    ? value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

const parseSocialRows = (value: string | null | undefined): SocialLinkRow[] => {
  const lines = splitLines(value);
  if (lines.length === 0) return [];

  return lines.map((line, index) => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    const label = match?.[1]?.trim() || `Ссылка ${index + 1}`;
    const url = (match?.[2] || line).trim();

    return {
      id: `${Date.now()}-${index}-${label}`,
      label,
      url,
    };
  });
};

const serializeSocialRows = (rows: SocialLinkRow[]) =>
  rows
    .map((row) => `${row.label.trim()}: ${row.url.trim()}`)
    .filter((line) => line !== ": ")
    .join("\n");

const makeSocialRow = (label = "", url = ""): SocialLinkRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  label,
  url,
});

const buildSocialHref = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const matchesQuery = (studio: Studio, query: string) => {
  if (!query) return true;
  const haystack = [
    studio.name,
    studio.description,
    studio.headUsername,
    studio.avatar,
    studio.banner,
    studio.socials,
    studio.contact,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
};

export default function StudioManager() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<StudioFormState>(createEmptyForm());
  const [socialRows, setSocialRows] = useState<SocialLinkRow[]>([]);

  const fetchStudios = async () => {
    try {
      const res = await fetch(`${API_URL}/api/studios`);
      if (!res.ok) throw new Error("failed to load studios");
      const data: Studio[] = await res.json();
      setStudios(data);
    } catch {
      setError("Не удалось загрузить студии");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStudios();
  }, []);

  const modalOpen = showCreateModal || editingId !== null;

  useEffect(() => {
    if (!mounted) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    if (modalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [modalOpen, mounted]);

  const closeModals = () => {
    setShowCreateModal(false);
    setEditingId(null);
    setFormData(createEmptyForm());
    setSocialRows([]);
    setIsSaving(false);
  };

  const openCreateModal = () => {
    setError(null);
    setSuccess(null);
    setEditingId(null);
    setFormData(createEmptyForm());
    setSocialRows([makeSocialRow()]);
    setShowCreateModal(true);
  };

  const startEdit = (studio: Studio) => {
    setError(null);
    setSuccess(null);
    setShowCreateModal(false);
    setEditingId(studio.id);
    setFormData({
      name: studio.name,
      description: studio.description || "",
      headUsername: studio.headUsername || "",
      avatar: studio.avatar || "",
      banner: studio.banner || "",
      socials: studio.socials || "",
      contact: studio.contact || "",
      isCollaboration: studio.isCollaboration,
    });
    setSocialRows(
      parseSocialRows(studio.socials).length > 0
        ? parseSocialRows(studio.socials)
        : [makeSocialRow()],
    );
  };

  const handleCreate = async (payload: StudioFormState) => {
    if (!payload.name.trim()) {
      setError("Название обязательно");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/studios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Ошибка создания");
      }

      setSuccess("Студия создана");
      closeModals();
      await fetchStudios();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети");
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: number, payload: StudioFormState) => {
    if (!payload.name.trim()) {
      setError("Название обязательно");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/studios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Ошибка обновления");
      }

      setSuccess("Студия обновлена");
      closeModals();
      await fetchStudios();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети");
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить студию? Это действие нельзя отменить.")) return;

    try {
      const res = await fetch(`${API_URL}/api/studios/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Ошибка удаления");
      }

      setSuccess("Студия удалена");
      await fetchStudios();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети");
    }
  };

  const filteredStudios = useMemo(
    () =>
      studios
        .filter((studio) => showInactive || studio.isCollaboration)
        .filter((studio) => matchesQuery(studio, query.trim().toLowerCase())),
    [studios, showInactive, query],
  );

  const totalCount = studios.length;
  const activeCount = studios.filter((studio) => studio.isCollaboration).length;
  const inactiveCount = totalCount - activeCount;
  const visibleCount = filteredStudios.length;

  const renderModal = (mode: "create" | "edit") => {
    const isCreate = mode === "create";
    const title = isCreate ? "Создать студию" : "Редактировать студию";
    const subtitle = isCreate
      ? "Заполните карточку студии, баннер, контакты и статус коллаборации."
      : "Обновите данные студии и сохраните изменения без потери структуры.";
    const submitLabel = isSaving
      ? isCreate
        ? "Создание..."
        : "Сохранение..."
      : isCreate
        ? "Создать студию"
        : "Сохранить изменения";
    const previewName = formData.name.trim() || "Новая студия";
    const previewHead = formData.headUsername.trim();
    const previewSocials = socialRows
      .map((row) => ({
        id: row.id,
        label: row.label.trim(),
        url: row.url.trim(),
      }))
      .filter((row) => row.label || row.url);

    const submitHandler = async () => {
      const payload = {
        ...formData,
        socials: serializeSocialRows(socialRows),
      };

      if (isCreate) {
        await handleCreate(payload);
      } else if (editingId !== null) {
        await handleUpdate(editingId, payload);
      }
    };

    const modalContent = (
      <div className={styles.modalOverlay} onClick={closeModals}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div>
              <div className={styles.modalKicker}>Студии</div>
              <h2 className={styles.modalTitle}>{title}</h2>
              <p className={styles.modalSubtitle}>{subtitle}</p>
            </div>
            <button className={styles.modalClose} onClick={closeModals} type="button">
              <X size={20} />
            </button>
          </div>

          <div className={styles.modalLayout}>
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                submitHandler();
              }}
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Название *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={styles.formInput}
                    placeholder="YumekoStudio"
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Глава студии</label>
                  <input
                    type="text"
                    value={formData.headUsername}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        headUsername: e.target.value.replace("@", ""),
                      })
                    }
                    className={styles.formInput}
                    placeholder="username"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Контакт</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: e.target.value })
                    }
                    className={styles.formInput}
                    placeholder="@username или email"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={styles.formTextarea}
                  placeholder="О студии..."
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <ImageUploadField
                    label="Аватар студии"
                    value={formData.avatar}
                    onChange={(url) => setFormData({ ...formData, avatar: url })}
                    placeholder="https://example.com/avatar.png"
                  />
                </div>

                <div className={styles.formGroup}>
                  <ImageUploadField
                    label="Баннер студии"
                    value={formData.banner}
                    onChange={(url) => setFormData({ ...formData, banner: url })}
                    placeholder="https://example.com/banner.jpg"
                  />
                </div>

                <div className={styles.formGroup}>

                  <label className={styles.formLabel}>Соцсети</label>
                  <div className={styles.socialLinksEditor}>
                    {socialRows.map((row, index) => (
                      <div key={row.id} className={styles.socialLinkRow}>
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) =>
                            setSocialRows((current) =>
                              current.map((item) =>
                                item.id === row.id
                                  ? { ...item, label: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          className={styles.socialLinkLabel}
                          placeholder="Название, например Telegram"
                        />
                        <input
                          type="url"
                          value={row.url}
                          onChange={(e) =>
                            setSocialRows((current) =>
                              current.map((item) =>
                                item.id === row.id
                                  ? { ...item, url: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          className={styles.socialLinkUrl}
                          placeholder="https://t.me/..."
                        />
                        <button
                          type="button"
                          className={styles.socialLinkRemove}
                          onClick={() =>
                            setSocialRows((current) =>
                              current.length > 1
                                ? current.filter((item) => item.id !== row.id)
                                : [makeSocialRow()],
                            )
                          }
                          aria-label={`Удалить ссылку ${index + 1}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.socialLinkAdd}
                      onClick={() => setSocialRows((current) => [...current, makeSocialRow()])}
                    >
                      <Plus size={14} />
                      Добавить ссылку
                    </button>
                  </div>
                </div>
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={formData.isCollaboration}
                  onChange={(e) =>
                    setFormData({ ...formData, isCollaboration: e.target.checked })
                  }
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>Активная коллаборация</span>
                {formData.isCollaboration ? (
                  <CheckCircle2 size={16} className={styles.checkboxIconActive} />
                ) : (
                  <AlertCircle size={16} className={styles.checkboxIconInactive} />
                )}
              </label>

              <div className={styles.formActions}>
                <button
                  className={styles.saveBtn}
                  type="submit"
                  disabled={isSaving}
                >
                  <Save size={16} />
                  {submitLabel}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className={styles.cancelBtn}
                >
                  Отмена
                </button>
              </div>
            </form>

            <aside className={styles.modalPreview}>
              <div
                className={styles.modalPreviewBanner}
                style={formData.banner ? { backgroundImage: `url(${formData.banner})` } : undefined}
              >
                <div className={styles.modalPreviewOverlay} />
                <div className={styles.modalPreviewAvatar}>
                  {formData.avatar ? (
                    <img src={formData.avatar} alt={previewName} />
                  ) : (
                    <div className={styles.modalPreviewAvatarFallback}>
                      {previewName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span
                  className={`${styles.statusPill} ${formData.isCollaboration ? styles.statusActive : styles.statusInactive}`}
                >
                  {formData.isCollaboration ? "Активна" : "Неактивна"}
                </span>
              </div>

              <div className={styles.modalPreviewBody}>
                <div className={styles.modalPreviewTop}>
                  <div>
                    <div className={styles.previewLabel}>Предпросмотр</div>
                    <h3 className={styles.modalPreviewName}>{previewName}</h3>
                  </div>
                  <div className={styles.previewCounter}>
                    {previewSocials.length > 0
                      ? `${previewSocials.length} ссылок`
                      : "Без соцсетей"}
                  </div>
                </div>

                <p className={styles.modalPreviewText}>
                  {formData.description.trim() ||
                    "Описание студии появится здесь после заполнения формы."}
                </p>

                <div className={styles.previewChips}>
                  {previewHead && (
                    <Link href={`/profile/${previewHead}`} className={styles.previewChip}>
                      <Users size={14} />
                      @{previewHead}
                    </Link>
                  )}

                  {formData.contact.trim() && (
                    <span className={styles.previewChip}>
                      <Mail size={14} />
                      {formData.contact.trim()}
                    </span>
                  )}

                  {formData.avatar.trim() && (
                    <span className={styles.previewChip}>
                      <Link2 size={14} />
                      Аватар готов
                    </span>
                  )}
                </div>

                {previewSocials.length > 0 && (
                  <div className={styles.previewSocials}>
                    {previewSocials.map((item) => {
                      const href = buildSocialHref(item.url);
                      const chip = (
                        <span className={styles.socialChipContent}>
                          <Globe size={13} />
                          <span>{item.label || item.url}</span>
                        </span>
                      );

                      return href ? (
                        <a
                          key={item.id}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.socialChip}
                        >
                          {chip}
                        </a>
                      ) : (
                        <span key={item.id} className={styles.socialChip}>
                          {chip}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );

    return mounted ? createPortal(modalContent, document.body) : null;
  };

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>Админ-панель / Студии</div>
          <h1 className={styles.title}>Студии</h1>
          <p className={styles.subtitle}>
            Управление студиями озвучки: статусы, главы, контакты, баннеры и ссылки.
          </p>

          <div className={styles.heroActions}>
            <button onClick={openCreateModal} className={styles.createBtn} type="button">
              <Plus size={16} />
              Создать студию
            </button>

            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <span>Показывать неактивные</span>
            </label>
          </div>
        </div>

        <div className={styles.heroStats}>
          <article className={styles.statCard}>
            <div className={styles.statValue}>{totalCount}</div>
            <div className={styles.statLabel}>Всего студий</div>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statValue}>{activeCount}</div>
            <div className={styles.statLabel}>Активные</div>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statValue}>{inactiveCount}</div>
            <div className={styles.statLabel}>Неактивные</div>
          </article>
        </div>
      </section>

      {(error || success) && (
        <div className={`${styles.message} ${error ? styles.error : styles.success}`}>
          {error || success}
          <button
            className={styles.messageClose}
            onClick={() => {
              setError(null);
              setSuccess(null);
            }}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className={styles.controls}>
          <label className={styles.searchBar}>
          <Plus size={16} className={styles.searchIcon} />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
            placeholder="Поиск по названию, главе, контактам..."
          />
        </label>
        <div className={styles.controlsMeta}>
          Показано {visibleCount} из {showInactive ? totalCount : activeCount}
        </div>
      </div>

      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Карточки студий</h2>
          <span className={styles.listHint}>Редактирование без потери структуры</span>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : filteredStudios.length === 0 ? (
          <div className={styles.empty}>Нет студий</div>
        ) : (
          <div className={styles.studioList}>
            {filteredStudios.map((studio) => {
              const socials = parseSocialRows(studio.socials);

              return (
                <article key={studio.id} className={styles.studioCard}>
                  <div
                    className={styles.cardCover}
                    style={studio.banner ? { backgroundImage: `url(${studio.banner})` } : undefined}
                  >
                    <div className={styles.cardOverlay} />
                    <div className={styles.cardAvatar}>
                      {studio.avatar ? (
                        <img src={studio.avatar} alt={studio.name} />
                      ) : (
                        <div className={styles.cardAvatarFallback}>
                          {studio.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span
                      className={`${styles.statusPill} ${studio.isCollaboration ? styles.statusActive : styles.statusInactive}`}
                    >
                      {studio.isCollaboration ? "Активна" : "Неактивна"}
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardTopRow}>
                      <div className={styles.cardTitleBlock}>
                        <h3 className={styles.studioName}>{studio.name}</h3>
                        {studio.headUsername && (
                          <Link
                            href={`/profile/${studio.headUsername}`}
                            className={styles.headLink}
                          >
                            <Users size={13} />
                            @{studio.headUsername}
                          </Link>
                        )}
                      </div>

                      <div className={styles.cardActions}>
                        <button
                          onClick={() => startEdit(studio)}
                          className={styles.editBtn}
                          type="button"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDelete(studio.id)}
                          className={styles.deleteBtn}
                          type="button"
                          aria-label="Удалить студию"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {studio.description && (
                      <p className={styles.studioDesc}>{studio.description}</p>
                    )}

                    <div className={styles.chipGrid}>
                      {studio.contact && (
                        <span className={styles.detailChip}>
                          <Mail size={13} />
                          {studio.contact}
                        </span>
                      )}

                      {studio.website && (
                        <a
                          href={studio.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.detailChip}
                        >
                          <Globe size={13} />
                          {studio.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}

                      {socials.length > 0
                        ? socials.map((item) => {
                            const href = buildSocialHref(item.url);
                            const content = (
                              <>
                                <Link2 size={13} />
                                <span>
                                  {item.label || item.url}
                                </span>
                              </>
                            );

                            return href ? (
                              <a
                                key={item.id}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.detailChip}
                              >
                                {content}
                              </a>
                            ) : (
                              <span key={item.id} className={styles.detailChip}>
                                {content}
                              </span>
                            );
                          })
                        : null}
                    </div>

                    <div className={styles.cardFooter}>
                      <span className={styles.footerText}>
                        {studio.isCollaboration
                          ? "Студия отображается в каталоге"
                          : "Скрыта из публичного каталога"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && renderModal("create")}
      {editingId !== null && renderModal("edit")}
    </div>
  );
}

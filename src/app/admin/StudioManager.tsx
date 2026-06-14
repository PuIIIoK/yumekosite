"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { API_URL } from "@/config/hosts";
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
  isCollaboration: boolean;
}

export default function StudioManager() {
  const auth = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    headUsername: "",
    avatar: "",
    banner: "",
    socials: "",
    contact: "",
    isCollaboration: true,
  });

  const fetchStudios = async () => {
    try {
      const res = await fetch(`${API_URL}/api/studios`);
      if (res.ok) {
        const data: Studio[] = await res.json();
        setStudios(data);
      }
    } catch (err) {
      setError("Не удалось загрузить студии");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudios();
  }, []);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("Название обязательно");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/studios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess("Студия создана");
        setFormData({
          name: "",
          description: "",
          headUsername: "",
          avatar: "",
          banner: "",
          socials: "",
          contact: "",
          isCollaboration: true,
        });
        fetchStudios();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Ошибка создания");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/studios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess("Студия обновлена");
        setEditingId(null);
        fetchStudios();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Ошибка обновления");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить студию? Это действие нельзя отменить.")) return;

    try {
      const res = await fetch(`${API_URL}/api/studios/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccess("Студия удалена");
        fetchStudios();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError("Ошибка удаления");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  const startEdit = (studio: Studio) => {
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      headUsername: "",
      avatar: "",
      banner: "",
      socials: "",
      contact: "",
      isCollaboration: true,
    });
  };

  const filteredStudios = showInactive
    ? studios
    : studios.filter((s) => s.isCollaboration);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Коллаборация</h1>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          <span>Показывать неактивные</span>
        </label>
      </div>
      
      {(error || success) && (
        <div className={`${styles.message} ${error ? styles.error : styles.success}`}>
          {error || success}
          <button 
            className={styles.messageClose}
            onClick={() => { setError(null); setSuccess(null); }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Форма создания */}
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>
          {editingId ? "Редактировать студию" : "Добавить студию"}
        </h2>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Название *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.formInput}
            placeholder="YumekoStudio"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Описание</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={styles.formTextarea}
            placeholder="О студии..."
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Глава студии (@username)</label>
          <input
            type="text"
            value={formData.headUsername}
            onChange={(e) => setFormData({ ...formData, headUsername: e.target.value })}
            className={styles.formInput}
            placeholder="@username"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Аватар (URL)</label>
          <input
            type="text"
            value={formData.avatar}
            onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            className={styles.formInput}
            placeholder="https://example.com/avatar.png"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Баннер (URL)</label>
          <input
            type="text"
            value={formData.banner}
            onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
            className={styles.formInput}
            placeholder="https://example.com/banner.jpg"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Соцсети</label>
          <textarea
            value={formData.socials}
            onChange={(e) => setFormData({ ...formData, socials: e.target.value })}
            className={styles.formTextarea}
            placeholder="Discord: https://discord.gg/...\nTelegram: https://t.me/..."
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Контакт для модерации</label>
          <input
            type="text"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            className={styles.formInput}
            placeholder="@username или email"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Статус коллаборации</label>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isCollaboration}
                onChange={(e) => setFormData({ ...formData, isCollaboration: e.target.checked })}
                className={styles.checkbox}
              />
              <span>Активная коллаборация</span>
              {formData.isCollaboration ? (
                <CheckCircle2 size={16} className={styles.checkboxIcon} />
              ) : (
                <AlertCircle size={16} className={styles.checkboxIcon} />
              )}
            </label>
          </div>
        </div>

        <div className={styles.formActions}>
          {editingId ? (
            <>
              <button
                onClick={() => handleUpdate(editingId)}
                className={styles.saveBtn}
              >
                <Save size={16} />
                Сохранить
              </button>
              <button
                onClick={cancelEdit}
                className={styles.cancelBtn}
              >
                Отмена
              </button>
            </>
          ) : (
            <button
              onClick={handleCreate}
              className={styles.createBtn}
            >
              <Plus size={16} />
              Добавить студию
            </button>
          )}
        </div>
      </div>

      {/* Список студий */}
      <div className={styles.listSection}>
        <h2 className={styles.listTitle}>
          Студии ({filteredStudios.length})
          {!showInactive && " (активные коллаборации)"}
        </h2>
        
        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : filteredStudios.length === 0 ? (
          <div className={styles.empty}>
            {showInactive ? "Нет студий" : "Нет активных коллабораций"}
          </div>
        ) : (
          <div className={styles.studioList}>
            {filteredStudios.map((studio) => (
              <div key={studio.id} className={styles.studioCard}>
                <div className={styles.studioHeader}>
                  <h3 className={styles.studioName}>
                    {studio.name}
                    {studio.isCollaboration && (
                      <span className={styles.collabBadge}>Коллаборация</span>
                    )}
                  </h3>
                  <div className={styles.studioActions}>
                    <button
                      onClick={() => startEdit(studio)}
                      className={styles.editBtn}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(studio.id)}
                      className={styles.deleteBtn}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {studio.description && (
                  <p className={styles.studioDesc}>{studio.description}</p>
                )}
                
                <div className={styles.studioDetails}>
                  {studio.headUsername && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Глава:</span>
                      @{studio.headUsername}
                    </div>
                  )}

                  {studio.avatar && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Аватар:</span>
                      <a href={studio.avatar} target="_blank" rel="noopener noreferrer">
                        {studio.avatar}
                      </a>
                    </div>
                  )}

                  {studio.banner && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Баннер:</span>
                      <a href={studio.banner} target="_blank" rel="noopener noreferrer">
                        {studio.banner}
                      </a>
                    </div>
                  )}
                  
                {studio.socials && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Соцсети:</span>
                    {studio.socials}
                  </div>
                )}
                  
                  {studio.contact && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Контакт:</span>
                      {studio.contact}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
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
  logo: string | null;
  website: string | null;
  contact: string | null;
  isCollaboration: boolean;
}

export default function StudioManager() {
  const auth = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logo: "",
    website: "",
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
          logo: "",
          website: "",
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
      logo: studio.logo || "",
      website: studio.website || "",
      contact: studio.contact || "",
      isCollaboration: studio.isCollaboration,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      logo: "",
      website: "",
      contact: "",
      isCollaboration: true,
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Коллаборация</h1>
      
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
          <label className={styles.formLabel}>Логотип (URL)</label>
          <input
            type="text"
            value={formData.logo}
            onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
            className={styles.formInput}
            placeholder="https://example.com/logo.png"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Сайт</label>
          <input
            type="text"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className={styles.formInput}
            placeholder="https://example.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Контакт</label>
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
        <h2 className={styles.listTitle}>Существующие студии ({studios.length})</h2>
        
        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : studios.length === 0 ? (
          <div className={styles.empty}>Нет студий</div>
        ) : (
          <div className={styles.studioList}>
            {studios.map((studio) => (
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
                  {studio.logo && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Логотип:</span>
                      <a href={studio.logo} target="_blank" rel="noopener noreferrer">
                        {studio.logo}
                      </a>
                    </div>
                  )}
                  
                  {studio.website && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Сайт:</span>
                      <a href={studio.website} target="_blank" rel="noopener noreferrer">
                        {studio.website}
                      </a>
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
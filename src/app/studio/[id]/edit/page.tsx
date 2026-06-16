"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/hosts";
import ImageUploadField from "@/components/ImageUploadField/ImageUploadField";
import styles from "./edit.module.scss";

interface StudioData {
  id: number;
  name: string;
  description: string | null;
  headUsername: string | null;
  avatar: string | null;
  banner: string | null;
  socials: string | null;
  website: string | null;
  contact: string | null;
  isCollaboration: boolean;
}

interface TeamMember {
  username: string;
  displayName: string;
  role: string;
  hasAvatar: boolean;
  status: "pending" | "approved" | "local";
}

const STUDIO_ROLES = [
  { value: "ACTOR", label: "Актёр" },
  { value: "RELIZER", label: "Релизёр" },
  { value: "SOUND_DIRECTOR", label: "Звукорежиссёр" },
];

export default function EditStudioPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params?.id as string) ?? "";

  const [studio, setStudio] = useState<StudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatar: "",
    banner: "",
    socials: "",
    website: "",
    contact: "",
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("ACTOR");
  const [submittingRoles, setSubmittingRoles] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/studios/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Студия не найдена");
        return r.json();
      })
      .then((data: StudioData) => {
        if (data.headUsername?.toLowerCase() !== user?.username?.toLowerCase()) {
          setError("У вас нет прав для редактирования этой студии");
          setLoading(false);
          return;
        }

        setStudio(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          avatar: data.avatar || "",
          banner: data.banner || "",
          socials: data.socials || "",
          website: data.website || "",
          contact: data.contact || "",
        });

        // Load team members from API
        fetch(`${API_URL}/api/studios/${id}/members`)
          .then((r) => r.ok ? r.json() : [])
          .then((members) => setTeamMembers(members))
          .catch(() => setTeamMembers([]));

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/api/studios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка обновления");
      }

      setSuccess("Студия успешно обновлена");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addTeamMember = () => {
    if (!newMemberUsername.trim()) return;
    const username = newMemberUsername.trim().replace("@", "").toLowerCase();
    // Check if already added
    if (teamMembers.some(m => m.username.toLowerCase() === username)) return;

    setTeamMembers([
      ...teamMembers,
      {
        username,
        displayName: username,
        role: newMemberRole,
        hasAvatar: false,
        status: "local",
      },
    ]);
    setNewMemberUsername("");
    setNewMemberRole("ACTOR");
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const submitRolesForModeration = async () => {
    const localMembers = teamMembers.filter(m => m.status === "local");
    if (localMembers.length === 0) return;

    setSubmittingRoles(true);
    try {
      const res = await fetch(`${API_URL}/api/studio-role-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId: parseInt(id),
          requests: localMembers.map(m => ({
            username: m.username,
            role: m.role,
          })),
          requestedBy: user?.username,
        }),
      });

      if (res.ok) {
        // Mark local members as pending
        setTeamMembers(teamMembers.map(m => 
          m.status === "local" ? { ...m, status: "pending" } : m
        ));
        setSuccess("Запросы на добавление ролей отправлены на модерацию");
      } else {
        const data = await res.json();
        setError(data.error || "Ошибка отправки");
      }
    } finally {
      setSubmittingRoles(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (error && !studio) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const hasLocalMembers = teamMembers.some(m => m.status === "local");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Редактирование студии</h1>
        <button onClick={() => router.push(`/studio/${id}`)} className={styles.backBtn}>
          ← Назад к студии
        </button>
      </div>

      {(error || success) && (
        <div className={`${styles.message} ${error ? styles.errorMessage : styles.successMessage}`}>
          {error || success}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Основная информация</h2>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Название студии</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              rows={4}
              placeholder="Расскажите о вашей студии..."
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Веб-сайт</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className={styles.input}
              placeholder="https://example.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Контакт</label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className={styles.input}
              placeholder="Email или другой контакт"
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Медиа</h2>
          
          <ImageUploadField
            label="Аватар студии"
            value={formData.avatar}
            onChange={(url) => setFormData({ ...formData, avatar: url })}
            placeholder="https://example.com/avatar.png"
          />

          <ImageUploadField
            label="Баннер студии"
            value={formData.banner}
            onChange={(url) => setFormData({ ...formData, banner: url })}
            placeholder="https://example.com/banner.jpg"
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Социальные сети</label>
            <textarea
              value={formData.socials}
              onChange={(e) => setFormData({ ...formData, socials: e.target.value })}
              className={styles.textarea}
              rows={3}
              placeholder="Discord: https://discord.gg/...\nTelegram: https://t.me/..."
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Команда</h2>
          
          <div className={styles.teamList}>
            {teamMembers.map((member, index) => (
              <div key={index} className={styles.teamMember}>
                <span className={styles.memberName}>@{member.username}</span>
                <span className={`${styles.memberRole} ${styles[`memberRole_${member.role}`] || ""}`}>
                  {STUDIO_ROLES.find(r => r.value === member.role)?.label || member.role}
                </span>
                {member.status === "pending" && (
                  <span className={styles.pendingBadge}>На модерации</span>
                )}
                {member.status === "approved" && (
                  <span className={styles.approvedBadge}>Одобрено</span>
                )}
                {member.status === "local" && (
                  <button
                    type="button"
                    onClick={() => removeTeamMember(index)}
                    className={styles.removeBtn}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.addMemberForm}>
            <input
              type="text"
              value={newMemberUsername}
              onChange={(e) => setNewMemberUsername(e.target.value)}
              className={styles.input}
              placeholder="Username (без @)"
            />
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className={styles.select}
            >
              {STUDIO_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <button type="button" onClick={addTeamMember} className={styles.addBtn}>
              + Добавить
            </button>
          </div>

          {hasLocalMembers && (
            <button
              type="button"
              onClick={submitRolesForModeration}
              disabled={submittingRoles}
              className={styles.submitRolesBtn}
            >
              {submittingRoles ? "Отправка..." : "Отправить роли на модерацию"}
            </button>
          )}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn}>
            Сохранить изменения
          </button>
          <button type="button" onClick={() => router.push(`/studio/${id}`)} className={styles.cancelBtn}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
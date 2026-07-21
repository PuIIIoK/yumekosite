"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, X, Loader2, Trash2, ShieldCheck } from "lucide-react";
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

interface UserSuggestion {
  username: string;
  displayName: string;
  hasAvatar: boolean;
}

const STUDIO_ROLES = [
  { value: "ACTOR", label: "Актёр" },
  { value: "RELIZER", label: "Релизёр" },
  { value: "SOUND_DIRECTOR", label: "Звукорежиссёр" },
  { value: "ANIME_UPLOADER", label: "Заливщик аниме" },
];

const roleLabel = (role: string) =>
  STUDIO_ROLES.find((r) => r.value === role)?.label || role;

// The search endpoint returns a hex-dumped JSON payload; decode it back to JSON.
function parseHexPayload(payload: string): any | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {}

  const bytes: number[] = [];
  for (const line of payload.split("\n")) {
    if (!line.trim()) continue;
    const hexPart = line.substring(10, 58).trim();
    for (const h of hexPart.split(/\s+/)) {
      if (h.length === 2) bytes.push(parseInt(h, 16));
    }
  }
  if (bytes.length === 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)).trim());
  } catch {
    return null;
  }
}

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

  // ── Member add flow ──
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [selectedRole, setSelectedRole] = useState("ACTOR");
  const [submitting, setSubmitting] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admins / moderators (priority >= 90) manage members instantly.
  // Regular users (studio head) have additions queued for moderation.
  const isPrivileged = !!user?.roles?.some((r) => (r.priority ?? 0) >= 90);

  useEffect(() => {
    fetch(`${API_URL}/api/studios/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Студия не найдена");
        return r.json();
      })
      .then((data: StudioData) => {
        if (!user) {
          setError("Необходимо войти в аккаунт");
          setLoading(false);
          return;
        }

        const username = user.username?.toLowerCase();
        const isHead = username === data.headUsername?.toLowerCase();

        // Fetch members to determine access. Only the studio head, its members,
        // or admins/moderators can edit. Everyone else is denied.
        fetch(`${API_URL}/api/studios/${id}/members`)
          .then((r) => (r.ok ? r.json() : []))
          .then((members: TeamMember[]) => {
            const isMember = members.some(
              (m) => m.username.toLowerCase() === username,
            );

            if (!isHead && !isMember && !isPrivileged) {
              setError("У вас нет доступа к редактированию этой студии");
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
            setTeamMembers(members.map((m) => ({ ...m, status: "approved" })));
            setLoading(false);
          })
          .catch(() => {
            // If members can't be loaded, only head/privileged may proceed.
            if (!isHead && !isPrivileged) {
              setError("У вас нет доступа к редактированию этой студии");
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
            setTeamMembers([]);
            setLoading(false);
          });
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);


  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced user search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(q)}`);
        const data = parseHexPayload(await res.text());
        const users: UserSuggestion[] = (data?.users || []).map((u: any) => ({
          username: u.username,
          displayName: u.displayName || u.username,
          hasAvatar: !!u.hasAvatar,
        }));
        setSuggestions(users);
        setDropdownOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Save studio info. Privileged users (admin/mod) apply changes instantly;
  // regular users submit them to moderation. Member/role management is separate.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (isPrivileged) {
        const res = await fetch(`${API_URL}/api/studios/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Ошибка обновления");
        }
        setSuccess("Студия успешно обновлена");
      } else {
        const res = await fetch(`${API_URL}/api/studio-edit-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studioId: parseInt(id),
            requestedBy: user?.username,
            payload: formData,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Не удалось отправить на модерацию");
        }
        setSuccess("Изменения студии отправлены на модерацию");
        setTimeout(() => window.dispatchEvent(new Event("notifications:refresh")), 250);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };


  const pickUser = (u: UserSuggestion) => {
    setSelectedUser(u);
    setSearchQuery(u.displayName);
    setDropdownOpen(false);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setSearchQuery("");
    setSuggestions([]);
  };

  // Add a member. Privileged users add instantly, others send to moderation.
  const addMember = async () => {
    if (!selectedUser || !user?.username) return;
    const username = selectedUser.username.toLowerCase();

    if (teamMembers.some((m) => m.username.toLowerCase() === username)) {
      setError("Этот пользователь уже в команде");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (isPrivileged) {
        const res = await fetch(`${API_URL}/api/studios/${id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            role: selectedRole,
            requestedBy: user.username,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Не удалось добавить участника");
        }
        setTeamMembers((prev) => [
          ...prev,
          {
            username,
            displayName: selectedUser.displayName,
            role: selectedRole,
            hasAvatar: selectedUser.hasAvatar,
            status: "approved",
          },
        ]);
        setSuccess("Участник добавлен");
      } else {
        const res = await fetch(`${API_URL}/api/studio-role-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studioId: parseInt(id),
            requests: [{ username, role: selectedRole }],
            requestedBy: user.username,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Не удалось отправить заявку");
        }
        setTeamMembers((prev) => [
          ...prev,
          {
            username,
            displayName: selectedUser.displayName,
            role: selectedRole,
            hasAvatar: selectedUser.hasAvatar,
            status: "pending",
          },
        ]);
        setSuccess("Заявка на добавление отправлена на модерацию");
      }
      clearSelectedUser();
      setSelectedRole("ACTOR");
      setTimeout(() => window.dispatchEvent(new Event("notifications:refresh")), 250);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Change a member's role (privileged only).
  const changeMemberRole = async (username: string, role: string) => {
    if (!isPrivileged || !user?.username) return;
    setTeamMembers((prev) =>
      prev.map((m) => (m.username === username ? { ...m, role } : m)),
    );
    try {
      await fetch(`${API_URL}/api/studios/${id}/members/${username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, requestedBy: user.username }),
      });
    } catch {
      setError("Не удалось изменить роль");
    }
  };

  // Remove a member (privileged only).
  const removeMember = async (username: string) => {
    if (!isPrivileged || !user?.username) return;
    const prev = teamMembers;
    setTeamMembers((cur) => cur.filter((m) => m.username !== username));
    try {
      const res = await fetch(
        `${API_URL}/api/studios/${id}/members/${username}?requestedBy=${encodeURIComponent(user.username)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
    } catch {
      setTeamMembers(prev);
      setError("Не удалось удалить участника");
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
              placeholder={"Discord: https://discord.gg/...\nTelegram: https://t.me/..."}
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Команда</h2>

          {teamMembers.length > 0 ? (
            <div className={styles.teamList}>
              {teamMembers.map((member) => (
                <div key={member.username} className={styles.teamMember}>
                  <div className={styles.memberAvatar}>
                    {member.hasAvatar ? (
                      <img
                        src={`${API_URL}/api/media/${member.username}/avatar`}
                        alt={member.displayName}
                      />
                    ) : (
                      <span>{(member.displayName || member.username).charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{member.displayName}</span>
                    <span className={styles.memberHandle}>@{member.username}</span>
                  </div>

                  {member.status === "pending" ? (
                    <span className={styles.pendingBadge}>На модерации</span>
                  ) : isPrivileged ? (
                    <select
                      value={member.role}
                      onChange={(e) => changeMemberRole(member.username, e.target.value)}
                      className={styles.select}
                    >
                      {STUDIO_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`${styles.memberRole} ${styles[`memberRole_${member.role}`] || ""}`}>
                      {roleLabel(member.role)}
                    </span>
                  )}

                  {isPrivileged && member.status !== "pending" && (
                    <button
                      type="button"
                      onClick={() => removeMember(member.username)}
                      className={styles.removeBtn}
                      aria-label="Удалить участника"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.teamEmpty}>
              <ShieldCheck size={18} />
              <span>В команде пока нет участников</span>
            </div>
          )}

          <div className={styles.addMemberBlock}>
            <span className={styles.addMemberTitle}>Добавить участника</span>

            <div className={styles.addMemberControls}>
              <div className={styles.searchBox} ref={searchBoxRef}>
                <div className={styles.searchInputWrap}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedUser(null);
                    }}
                    onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
                    className={styles.searchInput}
                    placeholder="Введите ник пользователя..."
                  />
                  {searching && <Loader2 size={15} className={styles.searchSpinner} />}
                  {selectedUser && !searching && (
                    <button
                      type="button"
                      className={styles.searchClear}
                      onClick={clearSelectedUser}
                      aria-label="Очистить"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {dropdownOpen && (
                  <div className={styles.dropdown}>
                    {suggestions.length === 0 ? (
                      <div className={styles.dropdownEmpty}>
                        {searchQuery.trim().length < 2
                          ? "Введите минимум 2 символа"
                          : "Никого не найдено"}
                      </div>
                    ) : (
                      suggestions.map((u) => (
                        <button
                          key={u.username}
                          type="button"
                          className={styles.dropdownItem}
                          onClick={() => pickUser(u)}
                        >
                          <div className={styles.dropdownAvatar}>
                            {u.hasAvatar ? (
                              <img
                                src={`${API_URL}/api/media/${u.username}/avatar`}
                                alt={u.displayName}
                              />
                            ) : (
                              <span>{u.displayName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className={styles.dropdownText}>
                            <span className={styles.dropdownName}>{u.displayName}</span>
                            <span className={styles.dropdownHandle}>@{u.username}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className={styles.select}
              >
                {STUDIO_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addMember}
                disabled={!selectedUser || submitting}
                className={styles.addBtn}
              >
                {submitting
                  ? "..."
                  : isPrivileged
                    ? "Добавить"
                    : "На модерацию"}
              </button>
            </div>

            <p className={styles.addMemberHint}>
              {isPrivileged
                ? "Как администратор/модератор вы добавляете участников мгновенно."
                : "Заявки на добавление отправляются на модерацию."}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn}>
            Сохранить изменения
          </button>
          <button
            type="button"
            onClick={() => router.push(`/studio/${id}`)}
            className={styles.cancelBtn}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

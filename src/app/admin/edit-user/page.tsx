"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header/Header";
import { ArrowLeft, Save, X, Loader2, Check, User as UserIcon, Shield, Upload, Trash2 } from "lucide-react";
import { API_URL } from "@/config/hosts";
import styles from "./editUser.module.scss";

interface UserData {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  email: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  effectVerifiedBadge: boolean;
  effectShimmer: boolean;
  effectBorderGlow: boolean;
  effectAvatarGlow: boolean;
  accentColor: string | null;
  role: { name: string; displayName: string; color: string; priority: number };
  createdAt: string | null;
}

interface FormState {
  displayName: string;
  username: string;
  bio: string;
  password: string;
  effectVerifiedBadge: boolean;
  effectShimmer: boolean;
  effectBorderGlow: boolean;
  effectAvatarGlow: boolean;
  accentColor: string;
}

export default function EditUserPage() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [user, setUser] = useState<UserData | null>(null);
  const [form, setForm] = useState<FormState>({
    displayName: "", username: "", bio: "", password: "",
    effectVerifiedBadge: false, effectShimmer: false, effectBorderGlow: false, effectAvatarGlow: false,
    accentColor: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const goBack = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => router.push("/admin#users"), 350);
  };
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (username: string, file: File, type: "avatar" | "banner") => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/api/profile/${username}/${type}`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      await uploadFile(user.username, file, "avatar");
      const res = await fetch(`${API_URL}/api/roles/users`);
      const users: UserData[] = await res.json();
      const found = users.find((u) => u.id === user.id);
      if (found) setUser(found);
    } catch { setError("Ошибка загрузки аватара"); }
    setUploadingAvatar(false);
  };

  const handleBannerUpload = async (file: File) => {
    if (!user) return;
    setUploadingBanner(true);
    try {
      await uploadFile(user.username, file, "banner");
      const res = await fetch(`${API_URL}/api/roles/users`);
      const users: UserData[] = await res.json();
      const found = users.find((u) => u.id === user.id);
      if (found) setUser(found);
    } catch { setError("Ошибка загрузки баннера"); }
    setUploadingBanner(false);
  };

  useEffect(() => {
    if (!auth.isAuthenticated || (auth.user?.role?.priority ?? 0) < 80) {
      router.replace("/");
      return;
    }
    if (!userId) {
      router.replace("/admin#users");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/roles/users`);
        const users: UserData[] = await res.json();
        const found = users.find((u) => String(u.id) === userId);
        if (!found) { setError("Пользователь не найден"); setLoading(false); return; }
        setUser(found);
        setForm({
          displayName: found.displayName || "",
          username: found.username || "",
          bio: found.bio || "",
          password: "",
          effectVerifiedBadge: found.effectVerifiedBadge,
          effectShimmer: found.effectShimmer,
          effectBorderGlow: found.effectBorderGlow,
          effectAvatarGlow: found.effectAvatarGlow,
          accentColor: found.accentColor || "",
        });
      } catch {
        setError("Ошибка загрузки");
      }
      setLoading(false);
    })();
  }, [auth, router, userId]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        displayName: form.displayName,
        username: form.username,
        bio: form.bio,
        effectVerifiedBadge: form.effectVerifiedBadge,
        effectShimmer: form.effectShimmer,
        effectBorderGlow: form.effectBorderGlow,
        effectAvatarGlow: form.effectAvatarGlow,
        accentColor: form.accentColor,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(`${API_URL}/api/roles/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Ошибка сохранения");
        setSaving(false);
        return;
      }
      setSaving(false);
      setSaved(true);
      setTimeout(() => router.push("/admin#users"), 500);
      return;
    } catch { setError("Сетевая ошибка"); }
    setSaving(false);
  };

  if (loading) {
    return (<><Header /><main className={styles.page}><div className={styles.container}><p style={{ color: "var(--text-secondary)" }}>Загрузка...</p></div></main></>);
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={`${styles.container} ${saved || leaving ? styles.containerOut : ""}`}>
          <div className={styles.topBar}>
            <button className={styles.backBtn} onClick={goBack}>
              <ArrowLeft size={16} /> Назад
            </button>
            <h1 className={styles.pageTitle}>Редактирование пользователя</h1>
            <div className={styles.topBarRight}>
              <button className={styles.cancelBtn} onClick={goBack}>Отмена</button>
              <button className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ""}`} onClick={handleSave} disabled={saving || saved}>
                {saved ? <><Check size={14} /> Сохранено</> : saving ? <><Loader2 size={14} className={styles.saveSpin} /> Сохраняю...</> : <><Save size={14} /> Сохранить</>}
              </button>
            </div>
          </div>

          {error && <div className={styles.errorBar}>{error}<button onClick={() => setError(null)}><X size={14} /></button></div>}

          {user && (
            <>
              <div className={styles.userHeader}>
                <div className={styles.userHeaderAvatar}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className={styles.userHeaderAvatarImg} />
                  ) : (
                    <UserIcon size={28} />
                  )}
                </div>
                <div className={styles.userHeaderInfo}>
                  <h2 className={styles.userHeaderName}>{user.displayName}</h2>
                  <div className={styles.userHeaderMeta}>
                    <span>@{user.username}</span>
                    <span>ID: {user.id}</span>
                    {user.email && <span>{user.email}</span>}
                  </div>
                </div>
                <span
                  className={styles.userHeaderRole}
                  style={{ borderColor: user.role.color, color: user.role.color }}
                >
                  <Shield size={11} /> {user.role.displayName}
                </span>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Медиа</h3>
                <div className={styles.mediaRow}>
                  <div className={styles.mediaBlock}>
                    <span className={styles.fieldLabel}>Аватар</span>
                    <div className={styles.mediaPreview} onClick={() => avatarRef.current?.click()}>
                      {uploadingAvatar ? (
                        <Loader2 size={20} className={styles.saveSpin} />
                      ) : user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className={styles.mediaPreviewImg} />
                      ) : (
                        <Upload size={20} />
                      )}
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                    <button className={styles.mediaUploadBtn} onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar}>
                      <Upload size={12} /> {uploadingAvatar ? "Загрузка..." : "Загрузить"}
                    </button>
                  </div>
                  <div className={styles.mediaBlock}>
                    <span className={styles.fieldLabel}>Баннер</span>
                    <div className={styles.mediaBanner} onClick={() => bannerRef.current?.click()}>
                      {uploadingBanner ? (
                        <Loader2 size={20} className={styles.saveSpin} />
                      ) : user.bannerUrl ? (
                        <img src={user.bannerUrl} alt="" className={styles.mediaBannerImg} />
                      ) : (
                        <Upload size={20} />
                      )}
                    </div>
                    <input ref={bannerRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); }} />
                    <button className={styles.mediaUploadBtn} onClick={() => bannerRef.current?.click()} disabled={uploadingBanner}>
                      <Upload size={12} /> {uploadingBanner ? "Загрузка..." : "Загрузить"}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Основное</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Ник</label>
                    <input
                      className={styles.fieldInput}
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      placeholder="Отображаемое имя"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Username</label>
                    <input
                      className={styles.fieldInput}
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="username"
                    />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.fieldLabel}>Описание</label>
                    <textarea
                      className={styles.fieldTextarea}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="О себе"
                      maxLength={300}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Безопасность</h3>
                <div className={styles.fieldRow}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.fieldLabel}>Новый пароль</label>
                    <input
                      className={styles.fieldInput}
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Оставьте пустым, чтобы не менять"
                    />
                    <span className={styles.fieldHint}>Пароль будет захеширован на сервере</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Эффекты и верификация</h3>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Бейдж верификации</span>
                  <div
                    className={`${styles.toggleSwitch} ${form.effectVerifiedBadge ? styles.toggleSwitchOn : ""}`}
                    onClick={() => setForm({ ...form, effectVerifiedBadge: !form.effectVerifiedBadge })}
                  >
                    <div className={styles.toggleKnob} />
                  </div>
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Shimmer-эффект</span>
                  <div
                    className={`${styles.toggleSwitch} ${form.effectShimmer ? styles.toggleSwitchOn : ""}`}
                    onClick={() => setForm({ ...form, effectShimmer: !form.effectShimmer })}
                  >
                    <div className={styles.toggleKnob} />
                  </div>
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Анимированная рамка</span>
                  <div
                    className={`${styles.toggleSwitch} ${form.effectBorderGlow ? styles.toggleSwitchOn : ""}`}
                    onClick={() => setForm({ ...form, effectBorderGlow: !form.effectBorderGlow })}
                  >
                    <div className={styles.toggleKnob} />
                  </div>
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Свечение аватара</span>
                  <div
                    className={`${styles.toggleSwitch} ${form.effectAvatarGlow ? styles.toggleSwitchOn : ""}`}
                    onClick={() => setForm({ ...form, effectAvatarGlow: !form.effectAvatarGlow })}
                  >
                    <div className={styles.toggleKnob} />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Акцентный цвет</h3>
                <div className={styles.accentRow}>
                  <input
                    type="color"
                    className={styles.accentColorPicker}
                    value={form.accentColor || "#a78bfa"}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  />
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="#a78bfa"
                    value={form.accentColor}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    maxLength={7}
                    style={{ flex: 1 }}
                  />
                  {form.accentColor && (
                    <button className={styles.accentReset} onClick={() => setForm({ ...form, accentColor: "" })}>Сбросить</button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookMarked, Search, Settings, Heart, X, User, Users, Bell, Palette, Shield, LogOut, ChevronRight, ArrowLeft, Mail, Lock, Eye, EyeOff, Bookmark, ShieldCheck, Sparkles, Crown, Star } from "lucide-react";
import { type AnimeDetails, getAccent } from "@/data/anime";
import { useAppearance, ACCENT_COLORS, type ThemeMode, type FontSize } from "@/context/AppearanceContext";
import { useAuth } from "@/context/AuthContext";
import ProtectedImage from "@/components/ProtectedImage/ProtectedImage";
import CropModal from "@/components/CropModal/CropModal";
import styles from "./Header.module.scss";
import { API_URL } from "@/config/hosts";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isReleasesActive = pathname.startsWith("/realeses") || pathname.startsWith("/releases");
  const appearance = useAppearance();
  const auth = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");
  const [settingsSubTab, setSettingsSubTab] = useState<string | null>(null);
  const [settingsAnimating, setSettingsAnimating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<AnimeDetails[]>([]);
  const [animeCatalog, setAnimeCatalog] = useState<AnimeDetails[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/anime`)
      .then((r) => r.json())
      .then((data: AnimeDetails[]) => setAnimeCatalog(data))
      .catch(() => {});
  }, []);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [authClosing, setAuthClosing] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const protectedTabs = ["profile", "security", "notifications"];
  const tabRequiresAuth = protectedTabs.includes(settingsTab) && !auth.isAuthenticated;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaveFading, setProfileSaveFading] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageUploadSuccess, setImageUploadSuccess] = useState(false);
  const [imageUploadFading, setImageUploadFading] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [custShimmer, setCustShimmer] = useState(false);
  const [custBorderGlow, setCustBorderGlow] = useState(false);
  const [custAvatarGlow, setCustAvatarGlow] = useState(false);
  const [custVerified, setCustVerified] = useState(false);
  const [custAccent, setCustAccent] = useState("");
  const [custSaving, setCustSaving] = useState(false);
  const [custSaveSuccess, setCustSaveSuccess] = useState(false);
  const [custSaveFading, setCustSaveFading] = useState(false);
  const [custSaveError, setCustSaveError] = useState<string | null>(null);
  const [custDirty, setCustDirty] = useState(false);
  const canCustomize = (auth.user?.role.priority ?? 0) >= 70;
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsClosing, setFriendsClosing] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [bookmarksClosing, setBookmarksClosing] = useState(false);
  const [bookmarksTab, setBookmarksTab] = useState<string>("favorites");
  const [bmIndicator, setBmIndicator] = useState({ left: 0, width: 0 });
  const bmTabsRef = useRef<HTMLDivElement>(null);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [friendsTab, setFriendsTab] = useState<"friends" | "pending">("friends");
  const [friendsLoading, setFriendsLoading] = useState(false);

  function parseHex(hex: string): any {
    const bytes: number[] = [];
    for (const line of hex.split("\n")) {
      if (!line.trim()) continue;
      const p = line.substring(10, 58).trim();
      for (const h of p.split(/\s+/)) { if (h.length === 2) bytes.push(parseInt(h, 16)); }
    }
    return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
  }

  const fetchFriendsData = async () => {
    if (!auth.user) return;
    setFriendsLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/friends/list/${auth.user.username}`),
        fetch(`${API_URL}/api/friends/pending/${auth.user.username}`),
      ]);
      const fData = parseHex(await fRes.text());
      const pData = parseHex(await pRes.text());
      if (fData.ok) setFriendsList(fData.friends);
      if (pData.ok) setPendingList(pData.pending);
    } catch {}
    setFriendsLoading(false);
  };

  const handleAcceptFriend = async (username: string) => {
    if (!auth.user) return;
    try {
      const res = await fetch(`${API_URL}/api/friends/accept/${username}?from=${auth.user.username}`, { method: "POST" });
      const d = parseHex(await res.text());
      if (d.ok) fetchFriendsData();
    } catch {}
  };

  const handleRejectFriend = async (username: string) => {
    if (!auth.user) return;
    try {
      const res = await fetch(`${API_URL}/api/friends/${username}?from=${auth.user.username}`, { method: "DELETE" });
      const d = parseHex(await res.text());
      if (d.ok) fetchFriendsData();
    } catch {}
  };

  const closeFriends = () => {
    if (friendsClosing) return;
    setFriendsClosing(true);
    setTimeout(() => { setFriendsOpen(false); setFriendsClosing(false); }, 350);
  };

  const closeBookmarks = () => {
    if (bookmarksClosing) return;
    setBookmarksClosing(true);
    setTimeout(() => { setBookmarksOpen(false); setBookmarksClosing(false); }, 350);
  };

  useEffect(() => {
    if (!bmTabsRef.current) return;
    const active = bmTabsRef.current.querySelector("[data-active='true']") as HTMLElement | null;
    if (active) {
      setBmIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    }
  }, [bookmarksTab, bookmarksOpen]);

  useEffect(() => {
    if (friendsOpen) { setFriendsTab("friends"); fetchFriendsData(); }
  }, [friendsOpen]);

  // ─── Friend request notifications (polling) ───
  const [friendNotifs, setFriendNotifs] = useState<any[]>([]);
  const seenRequestIds = useRef<Set<number>>(new Set());
  const notifTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismissNotif = (id: number) => {
    setFriendNotifs(prev => prev.filter(n => n.id !== id));
  };

  const handleNotifAccept = async (f: any) => {
    if (!auth.user) return;
    try {
      const res = await fetch(`${API_URL}/api/friends/accept/${f.username}?from=${auth.user.username}`, { method: "POST" });
      const d = parseHex(await res.text());
      if (d.ok) dismissNotif(f.id);
    } catch {}
  };

  const handleNotifReject = async (f: any) => {
    if (!auth.user) return;
    try {
      const res = await fetch(`${API_URL}/api/friends/${f.username}?from=${auth.user.username}`, { method: "DELETE" });
      const d = parseHex(await res.text());
      if (d.ok) dismissNotif(f.id);
    } catch {}
  };

  useEffect(() => {
    if (!auth.user) return;

    const pollPending = async () => {
      try {
        const res = await fetch(`${API_URL}/api/friends/pending/${auth.user!.username}`);
        const data = parseHex(await res.text());
        if (data.ok && data.pending) {
          const newOnes = data.pending.filter((p: any) => !seenRequestIds.current.has(p.id));
          for (const n of newOnes) {
            seenRequestIds.current.add(n.id);
          }
          if (newOnes.length > 0) {
            setFriendNotifs(prev => [...prev, ...newOnes]);
          }
        }
      } catch {}
    };

    pollPending();
    notifTimerRef.current = setInterval(pollPending, 10000);

    return () => {
      if (notifTimerRef.current) clearInterval(notifTimerRef.current);
    };
  }, [auth.user?.username]);

  const FRIEND_ROLE_COLORS: Record<string, { c1: string; c2: string }> = {
    ADMIN: { c1: "#a78bfa", c2: "#f472b6" },
    PRE_ADMIN: { c1: "#c084fc", c2: "#a78bfa" },
    ST_MODERATOR: { c1: "#34d399", c2: "#2dd4bf" },
    MODERATOR: { c1: "#38bdf8", c2: "#60a5fa" },
  };

  const getFriendCardStyle = (f: any): React.CSSProperties => {
    const hasEffect = f.effectShimmer || f.effectBorderGlow || f.effectAvatarGlow || f.effectVerifiedBadge;
    if (!hasEffect) return {};
    const rc = f.accentColor
      ? { c1: f.accentColor, c2: f.accentColor }
      : FRIEND_ROLE_COLORS[f.role?.name] || null;
    if (!rc) return {};
    return { "--fc-c1": rc.c1, "--fc-c2": rc.c2 } as React.CSSProperties;
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBannerCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBannerCropApply = (croppedFile: File) => {
    setBannerCropSrc(null);
    handleImageUpload("banner", croppedFile);
  };

  const handleImageUpload = async (type: "avatar" | "banner", file: File) => {
    setImageUploading(true);
    setImageUploadError(null);
    setImageUploadSuccess(false);
    setImageUploadFading(false);

    const start = Date.now();
    const result = await auth.uploadImage(type, file);
    const elapsed = Date.now() - start;
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - elapsed)));

    if (result.ok) {
      setImageUploadSuccess(true);
      setTimeout(() => {
        setImageUploadFading(true);
        setTimeout(() => { setImageUploadSuccess(false); setImageUploadFading(false); }, 500);
      }, 1500);
    } else {
      setImageUploadError(result.error);
    }
    setImageUploading(false);
  };

  useEffect(() => {
    if (settingsOpen && auth.user) {
      setProfileDisplayName(auth.user.displayName || "");
      setProfileBio(auth.user.bio || "");
      setProfileSaveError(null);
      setProfileSaveSuccess(false);
      setProfileSaveFading(false);
      setProfileDirty(false);
      const fx = auth.user.effects;
      setCustShimmer(fx?.effectShimmer ?? false);
      setCustBorderGlow(fx?.effectBorderGlow ?? false);
      setCustAvatarGlow(fx?.effectAvatarGlow ?? false);
      setCustVerified(fx?.effectVerifiedBadge ?? false);
      setCustAccent(fx?.accentColor || "");
      setCustSaveError(null);
      setCustSaveSuccess(false);
      setCustSaveFading(false);
      setCustDirty(false);
    }
  }, [settingsOpen, auth.user]);

  const handleProfileSave = async (field: "displayName" | "bio") => {
    setProfileSaving(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(false);
    setProfileSaveFading(false);

    const data = field === "displayName"
      ? { displayName: profileDisplayName }
      : { bio: profileBio };

    const start = Date.now();
    const result = await auth.updateProfile(data);
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, 500 - elapsed);

    await new Promise((r) => setTimeout(r, remaining));

    if (result.ok) {
      setProfileSaveSuccess(true);
      setProfileDirty(false);
      setTimeout(() => {
        setProfileSaveFading(true);
        setTimeout(() => { setProfileSaveSuccess(false); setProfileSaveFading(false); }, 500);
      }, 1500);
    } else {
      setProfileSaveError(result.error);
    }
    setProfileSaving(false);
  };

  const handleCustSave = async () => {
    setCustSaving(true);
    setCustSaveError(null);
    setCustSaveSuccess(false);
    setCustSaveFading(false);
    const start = Date.now();
    const result = await auth.updateProfile({
      effectShimmer: custShimmer,
      effectBorderGlow: custBorderGlow,
      effectAvatarGlow: custAvatarGlow,
      effectVerifiedBadge: custVerified,
      accentColor: custAccent || "",
    });
    const elapsed = Date.now() - start;
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - elapsed)));
    if (result.ok) {
      setCustSaveSuccess(true);
      setCustDirty(false);
      setTimeout(() => {
        setCustSaveFading(true);
        setTimeout(() => { setCustSaveSuccess(false); setCustSaveFading(false); }, 500);
      }, 1500);
    } else {
      setCustSaveError(result.error);
    }
    setCustSaving(false);
  };

  const handleProfileCancel = () => {
    if (auth.user) {
      setProfileDisplayName(auth.user.displayName || "");
      setProfileBio(auth.user.bio || "");
    }
    setProfileSaveError(null);
    setProfileSaveSuccess(false);
    setProfileSaveFading(false);
    setProfileDirty(false);
  };

  useEffect(() => {
    setAuthError(null);
  }, [authMode, authOpen]);

  useEffect(() => {
    const anyModalOpen = searchOpen || settingsOpen || authOpen;
    if (!anyModalOpen) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [searchOpen, settingsOpen, authOpen]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;

    const loginValue = loginInputRef.current?.value ?? "";
    const passwordValue = passwordInputRef.current?.value ?? "";

    setAuthError(null);
    setAuthLoading(true);

    let result;
    if (authMode === "login") {
      result = await auth.login(loginValue, passwordValue);
    } else {
      const confirmValue = confirmPasswordInputRef.current?.value ?? "";
      result = await auth.register(loginValue, passwordValue, confirmValue);
    }

    if (result.ok) {
      const user = result.user;
      setTimeout(() => {
        router.push(`/profile/${user.username}`);
        setTimeout(() => {
          setAuthOpen(false);
          setAuthLoading(false);
        }, 250);
      }, 900);
    } else {
      setAuthError(result.error);
      setAuthLoading(false);
    }
  };

  const CLOSE_DURATION = 350;

  const closeSearch = () => {
    setSearchClosing(true);
    setTimeout(() => { setSearchOpen(false); setSearchClosing(false); }, CLOSE_DURATION);
  };

  const closeSettings = () => {
    setSettingsClosing(true);
    setTimeout(() => { setSettingsOpen(false); setSettingsClosing(false); }, CLOSE_DURATION);
  };

  const closeAuth = () => {
    setAuthClosing(true);
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    setTimeout(() => { setAuthOpen(false); setAuthClosing(false); }, CLOSE_DURATION);
  };

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!searchOpen) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (bookmarksOpen && !bookmarksClosing) closeBookmarks();
        if (friendsOpen && !friendsClosing) closeFriends();
        if (searchOpen && !searchClosing) closeSearch();
        if (settingsOpen && !settingsClosing) closeSettings();
        if (authOpen && !authClosing) closeAuth();
        setProfileMenuOpen(false);
      }
    };
    if (searchOpen || settingsOpen || profileMenuOpen || friendsOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [searchOpen, settingsOpen, profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setUserResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const q = searchQuery.toLowerCase();
      const results = animeCatalog.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.altTitle && a.altTitle.toLowerCase().includes(q)) ||
          (a.genres && a.genres.toLowerCase().includes(q))
      );
      setSearchResults(results);

      try {
        const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = parseHex(await res.text());
        if (data.ok) setUserResults(data.users || []);
        else setUserResults([]);
      } catch {
        setUserResults([]);
      }

      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const switchTab = (tab: string) => {
    if (tab === settingsTab || settingsAnimating) return;
    setSettingsAnimating(true);
    setTimeout(() => {
      setSettingsTab(tab);
      setSettingsSubTab(null);
      setSettingsAnimating(false);
    }, 300);
  };

  const openSubTab = (sub: string) => {
    if (settingsAnimating) return;
    setSettingsAnimating(true);
    setTimeout(() => {
      setSettingsSubTab(sub);
      setSettingsAnimating(false);
    }, 300);
  };

  const closeSubTab = () => {
    if (settingsAnimating) return;
    setSettingsAnimating(true);
    setTimeout(() => {
      setSettingsSubTab(null);
      setSettingsAnimating(false);
    }, 300);
  };

  const subTabTitles: Record<string, Record<string, string>> = {
    profile: { username: "Имя пользователя", avatar: "Аватар", bio: "О себе", customize: "Кастомизация профиля" },
    security: { password: "Пароль", twofa: "Двухфакторная аутентификация", sessions: "Активные сессии" },
    notifications: { push: "Push-уведомления", email: "Email-уведомления", releases: "Уведомления о релизах" },
    appearance: { theme: "Тема", accent: "Акцентный цвет", font: "Размер шрифта" },
    general: { language: "Язык", quality: "Качество видео", autoplay: "Автовоспроизведение" },
  };

  const tabTitles: Record<string, string> = {
    profile: "Профиль",
    security: "Безопасность",
    notifications: "Уведомления",
    appearance: "Внешний вид",
    general: "Основные",
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>

        {/* Left */}
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            <video
              className={styles.logoVideo}
              src="/logo_yumekosite.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
          </Link>
          <nav className={styles.nav}>
            <Link
              href="/releases"
              className={`${styles.navLink} ${isReleasesActive ? styles.navLinkActive : ""}`}
              aria-current={isReleasesActive ? "page" : undefined}
            >
              Релизы
            </Link>
            <Link href="/schedule" className={styles.navLink}>Расписание</Link>
            <Link href="/apps" className={styles.navLink}>Приложения</Link>
          </nav>
        </div>

        {/* Center — Search */}
        <button
          className={`${styles.searchBar} ${searchOpen ? styles.searchBarHidden : ""}`}
          onClick={() => setSearchOpen(true)}
        >
          <Search size={16} />
          <span>Поиск</span>
        </button>

        {/* Right */}
        <div className={styles.right}>
          <Link href="/support" className={styles.supportLink}>
            <Heart size={15} strokeWidth={2.5} />
            Поддержать
          </Link>
          <button className={styles.iconBtn} aria-label="Закладки" onClick={() => setBookmarksOpen(true)}>
            <BookMarked size={20} />
          </button>
          {auth.isAuthenticated && auth.user ? (
            <div className={styles.profileMenuWrap} ref={profileMenuRef}>
              <button
                className={styles.avatarBtn}
                aria-label={auth.user.displayName}
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((v) => !v)}
              >
                <div className={styles.avatarAuth} style={{ "--header-avatar-accent": auth.user.effects?.accentColor || "var(--accent)" } as React.CSSProperties}>
                  {auth.user.hasAvatar ? (
                    <ProtectedImage src={`${API_URL}/api/media/${auth.user.username}/avatar?v=${auth.user.imageVersion}`} alt={auth.user.displayName} className={styles.avatarAuthImg} />
                  ) : (
                    <span className={styles.avatarInitial}>{auth.user.displayName.charAt(0)}</span>
                  )}
                </div>
              </button>

              {profileMenuOpen && (
                <div className={styles.profileMenu} role="menu">
                  <div className={styles.profileMenuBanner}>
                    {auth.user.hasBanner && <ProtectedImage src={`${API_URL}/api/media/${auth.user.username}/banner?v=${auth.user.imageVersion}`} alt="banner" className={styles.profileMenuBannerImg} />}
                  </div>

                  <div className={styles.profileMenuTop}>
                    <div className={styles.profileMenuAvatar}>
                      {auth.user.hasAvatar ? (
                        <ProtectedImage src={`${API_URL}/api/media/${auth.user.username}/avatar?v=${auth.user.imageVersion}`} alt={auth.user.displayName} className={styles.profileMenuAvatarImg} />
                      ) : (
                        <span>{auth.user.displayName.charAt(0)}</span>
                      )}
                    </div>

                    <div className={styles.profileMenuIdentity}>
                      <div className={styles.profileMenuNameRow}>
                        <span className={styles.profileMenuName}>{auth.user.displayName}</span>
                        <div className={styles.profileMenuBadges}>
                          <span
                            className={styles.profileMenuBadge}
                            style={{ color: auth.user.role.color }}
                            title={auth.user.role.displayName}
                          >
                            {auth.user.role.name === "ADMIN" && <Crown size={14} strokeWidth={2.4} />}
                            {auth.user.role.name === "PRE_ADMIN" && <Shield size={14} strokeWidth={2.4} />}
                            {auth.user.role.name === "ST_MODERATOR" && <ShieldCheck size={14} strokeWidth={2.4} />}
                            {auth.user.role.name === "MODERATOR" && <Shield size={14} strokeWidth={2.4} />}
                            {auth.user.role.name === "USER" && <Star size={14} strokeWidth={2.4} />}
                          </span>
                        </div>
                      </div>
                      <span className={styles.profileMenuHandle}>{auth.user.handle}</span>
                    </div>

                    <div className={styles.profileMenuBio}>
                      <span className={styles.profileMenuBioLabel}>О себе</span>
                      <p className={styles.profileMenuBioText}>
                        {auth.user.bio || "Пока вы ничего о себе не рассказали."}
                      </p>
                    </div>
                  </div>

                  <div className={styles.profileMenuDivider} />

                  <div className={styles.profileMenuList}>
                    <Link
                      href={`/profile/${auth.user.username}`}
                      className={styles.profileMenuItem}
                      onClick={() => setProfileMenuOpen(false)}
                      role="menuitem"
                    >
                      <User size={16} />
                      <span>Мой профиль</span>
                    </Link>
                    <button
                      className={styles.profileMenuItem}
                      onClick={() => { setProfileMenuOpen(false); setBookmarksOpen(true); }}
                      role="menuitem"
                    >
                      <Bookmark size={16} />
                      <span>Мои закладки</span>
                    </button>
                    <button
                      className={styles.profileMenuItem}
                      onClick={() => { setProfileMenuOpen(false); setFriendsOpen(true); }}
                      role="menuitem"
                    >
                      <Users size={16} />
                      <span>Мои друзья</span>
                    </button>
                    {auth.user.username === "yumekoadmin" && (
                      <Link
                        href="/admin"
                        className={styles.profileMenuItem}
                        onClick={() => setProfileMenuOpen(false)}
                        role="menuitem"
                      >
                        <ShieldCheck size={16} />
                        <span>Админ панель</span>
                      </Link>
                    )}
                    <button
                      className={styles.profileMenuItem}
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setSettingsOpen(true);
                      }}
                      role="menuitem"
                    >
                      <Settings size={16} />
                      <span>Настройки</span>
                    </button>
                  </div>

                  {(auth.user?.role?.priority ?? 0) >= 80 && (
                    <button
                      className={styles.profileMenuItem}
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push("/admin");
                      }}
                      role="menuitem"
                    >
                      <Shield size={16} />
                      <span>Админ панель</span>
                    </button>
                  )}

                  <div className={styles.profileMenuDivider} />

                  <button
                    className={`${styles.profileMenuItem} ${styles.profileMenuItemDanger}`}
                    onClick={() => {
                      auth.logout();
                      setProfileMenuOpen(false);
                      router.push("/");
                    }}
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>Выйти</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className={styles.avatarBtn} aria-label="Войти" onClick={() => setAuthOpen(true)}>
              <div className={styles.avatarGuest}>
                <User size={18} strokeWidth={2} />
              </div>
            </button>
          )}
        </div>

      </div>

      {/* Search Modal */}
      {/* Settings Modal */}
      {settingsOpen && (
        <div className={`${styles.settingsModal} ${settingsClosing ? styles.settingsModalClosing : ""}`}>
          <div className={styles.settingsSidebar}>
            <span className={styles.settingsSidebarTitle}>Аккаунт</span>
            <button
              className={`${styles.settingsItem} ${settingsTab === "profile" ? styles.settingsItemActive : ""}`}
              onClick={() => switchTab("profile")}
            >
              <User size={18} /> Профиль
            </button>
            <button
              className={`${styles.settingsItem} ${settingsTab === "security" ? styles.settingsItemActive : ""}`}
              onClick={() => switchTab("security")}
            >
              <Shield size={18} /> Безопасность
            </button>
            <button
              className={`${styles.settingsItem} ${settingsTab === "notifications" ? styles.settingsItemActive : ""}`}
              onClick={() => switchTab("notifications")}
            >
              <Bell size={18} /> Уведомления
            </button>

            <span className={styles.settingsSidebarTitle}>Приложение</span>
            <button
              className={`${styles.settingsItem} ${settingsTab === "appearance" ? styles.settingsItemActive : ""}`}
              onClick={() => switchTab("appearance")}
            >
              <Palette size={18} /> Внешний вид
            </button>
            <button
              className={`${styles.settingsItem} ${settingsTab === "general" ? styles.settingsItemActive : ""}`}
              onClick={() => switchTab("general")}
            >
              <Settings size={18} /> Основные
            </button>

          </div>

          <div className={styles.settingsContent}>
            <div className={styles.settingsHeader}>
              <div className={styles.settingsTitleWrap}>
                {settingsSubTab ? (
                  <div className={styles.settingsBreadcrumb}>
                    <button className={styles.settingsBackBtn} onClick={closeSubTab}>
                      <ArrowLeft size={16} />
                    </button>
                    <span className={styles.settingsBreadcrumbParent} onClick={closeSubTab}>
                      {tabTitles[settingsTab]}
                    </span>
                    <ChevronRight size={13} className={styles.settingsBreadcrumbSep} />
                    <span className={styles.settingsBreadcrumbCurrent}>
                      {subTabTitles[settingsTab]?.[settingsSubTab]}
                    </span>
                  </div>
                ) : (
                  <h2 className={styles.settingsTitle}>{tabTitles[settingsTab]}</h2>
                )}
              </div>
              <button className={styles.searchClose} onClick={() => { closeSettings(); setTimeout(() => { setSettingsTab("profile"); setSettingsSubTab(null); }, CLOSE_DURATION); }}>
                <X size={20} />
              </button>
            </div>
            <div
              className={`${styles.settingsBody} ${settingsAnimating ? styles.settingsBodyOut : styles.settingsBodyIn}`}
              key={`${settingsTab}-${settingsSubTab}`}
            >
              {tabRequiresAuth && (
                <div className={styles.authRequiredOverlay}>
                  <div className={styles.authRequiredCard}>
                    <div className={styles.authRequiredIcon}>
                      <Lock size={24} strokeWidth={1.75} />
                    </div>
                    <h3 className={styles.authRequiredTitle}>Требуется авторизация</h3>
                    <p className={styles.authRequiredDesc}>
                      Чтобы использовать эти настройки, вам нужно войти в аккаунт или зарегистрироваться.
                    </p>
                    <button
                      className={styles.authRequiredBtn}
                      onClick={() => {
                        closeSettings();
                        setTimeout(() => setAuthOpen(true), CLOSE_DURATION);
                      }}
                    >
                      Войти в аккаунт
                    </button>
                  </div>
                </div>
              )}
              {!settingsSubTab && settingsTab === "profile" && (
                <>
                  <div className={styles.settingsCard} onClick={() => openSubTab("username")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Имя пользователя</div>
                      <div className={styles.settingsCardDesc}>Ваше отображаемое имя на платформе. Его видят другие пользователи.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("avatar")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Аватар</div>
                      <div className={styles.settingsCardDesc}>Загрузите изображение, которое будет использоваться как ваш аватар.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("banner")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Баннер</div>
                      <div className={styles.settingsCardDesc}>Загрузите изображение для баннера вашего профиля.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("bio")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>О себе</div>
                      <div className={styles.settingsCardDesc}>Расскажите немного о себе. Эта информация будет видна в вашем профиле.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={`${styles.settingsCard}${!canCustomize ? ` ${styles.settingsCardDisabled}` : ""}`} onClick={canCustomize ? () => openSubTab("customize") : undefined}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Кастомизация профиля</div>
                      <div className={styles.settingsCardDesc}>{canCustomize ? "Настройте визуальные эффекты вашего профиля: свечение, анимации, акцентный цвет." : "Доступно для модераторов и выше."}</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                </>
              )}
              {!settingsSubTab && settingsTab === "security" && (
                <>
                  <div className={styles.settingsCard} onClick={() => openSubTab("password")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Пароль</div>
                      <div className={styles.settingsCardDesc}>Измените пароль для входа в аккаунт.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={`${styles.settingsCard} ${styles.settingsCardDisabled}`}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Двухфакторная аутентификация</div>
                      <div className={styles.settingsCardDesc}>Скоро — добавьте дополнительный уровень защиты с помощью 2FA.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("sessions")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Активные сессии</div>
                      <div className={styles.settingsCardDesc}>Просмотрите и завершите активные сессии на других устройствах.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                </>
              )}
              {!settingsSubTab && settingsTab === "notifications" && (
                <>
                  <div className={styles.settingsCard} onClick={() => openSubTab("push")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Push-уведомления</div>
                      <div className={styles.settingsCardDesc}>Уведомления о новых эпизодах и обновлениях в браузере.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("email")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Email-уведомления</div>
                      <div className={styles.settingsCardDesc}>Настройте, какие уведомления отправлять на вашу почту.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("releases")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Уведомления о релизах</div>
                      <div className={styles.settingsCardDesc}>Уведомления при выходе новых эпизодов отслеживаемых аниме.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                </>
              )}
              {!settingsSubTab && settingsTab === "appearance" && (
                <>
                  <div className={styles.settingsCard} onClick={() => openSubTab("theme")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Тема</div>
                      <div className={styles.settingsCardDesc}>Выберите тёмную или светлую тему оформления интерфейса.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("accent")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Акцентный цвет</div>
                      <div className={styles.settingsCardDesc}>Настройте основной цвет интерфейса под свой вкус.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("font")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Размер шрифта</div>
                      <div className={styles.settingsCardDesc}>Измените размер текста для комфортного чтения.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                </>
              )}
              {!settingsSubTab && settingsTab === "general" && (
                <>
                  <div className={styles.settingsCard} onClick={() => openSubTab("language")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Язык</div>
                      <div className={styles.settingsCardDesc}>Выберите язык интерфейса платформы.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("quality")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Качество видео</div>
                      <div className={styles.settingsCardDesc}>Установите качество воспроизведения по умолчанию.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                  <div className={styles.settingsCard} onClick={() => openSubTab("autoplay")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Автовоспроизведение</div>
                      <div className={styles.settingsCardDesc}>Автоматически запускать следующий эпизод после окончания текущего.</div></div>
                      <ChevronRight size={16} className={styles.settingsCardChevron} />
                    </div>
                  </div>
                </>
              )}

              {/* Sub-tab content */}
              {settingsSubTab === "username" && (
                <div className={styles.settingsSubContent}>
                  <p className={styles.settingsSubLabel}>Отображаемое имя</p>
                  <input
                    className={styles.settingsInput}
                    type="text"
                    placeholder="Введите имя пользователя"
                    value={profileDisplayName}
                    onChange={(e) => { setProfileDisplayName(e.target.value); setProfileDirty(true); setProfileSaveSuccess(false); setProfileSaveFading(false); }}
                    maxLength={64}
                  />
                  <p className={styles.settingsSubHint}>Имя будет видно другим пользователям на платформе.</p>
                  {profileSaveError && <div className={styles.settingsSaveError}>{profileSaveError}</div>}
                  <div className={styles.settingsFooterRow}>
                    {profileSaveSuccess && (
                      <div className={`${styles.settingsSaveSuccess} ${profileSaveFading ? styles.settingsSaveSuccessFading : ""}`}>
                        Сохранено успешно!
                      </div>
                    )}
                    <div className={styles.settingsBtnRow}>
                      <button className={styles.settingsBtnCancel} onClick={handleProfileCancel} disabled={profileSaving}>Отменить</button>
                      <button
                        className={`${styles.settingsBtn} ${profileSaving ? styles.settingsBtnLoading : ""}`}
                        onClick={() => handleProfileSave("displayName")}
                        disabled={profileSaving || !profileDirty}
                      >
                        <span style={profileSaving ? { visibility: "hidden" } : undefined}>Сохранить</span>
                        {profileSaving && <span className={styles.settingsBtnSpinner} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {settingsSubTab === "avatar" && (
                <div className={styles.settingsSubContent}>
                  <p className={styles.settingsSubLabel}>Загрузка аватара</p>
                  <div className={styles.settingsAvatarUpload}>
                    <div className={styles.settingsAvatarPreview}>
                      {auth.user?.hasAvatar && <ProtectedImage src={`${API_URL}/api/media/${auth.user.username}/avatar?v=${auth.user.imageVersion}`} alt="avatar" className={styles.settingsAvatarImg} />}
                    </div>
                    <button className={`${styles.settingsBtn} ${imageUploading ? styles.settingsBtnLoading : ""}`} onClick={() => avatarInputRef.current?.click()} disabled={imageUploading}>
                      <span style={imageUploading ? { visibility: "hidden" } : undefined}>Выбрать файл</span>
                      {imageUploading && <span className={styles.settingsBtnSpinner} />}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload("avatar", f); e.target.value = ""; }}
                    />
                  </div>
                  <p className={styles.settingsSubHint}>Рекомендуемый размер: 256×256 px. Форматы: JPG, PNG, WebP, GIF. Максимум 5 МБ.</p>
                  {imageUploadError && <div className={styles.settingsSaveError}>{imageUploadError}</div>}
                  {imageUploadSuccess && (
                    <div className={`${styles.settingsSaveSuccess} ${imageUploadFading ? styles.settingsSaveSuccessFading : ""}`}>
                      Аватар загружен!
                    </div>
                  )}
                </div>
              )}
              {settingsSubTab === "banner" && (
                <div className={styles.settingsSubContent}>
                  <p className={styles.settingsSubLabel}>Загрузка баннера</p>
                  <div className={styles.settingsBannerUpload}>
                    <div className={styles.settingsBannerPreview}>
                      {auth.user?.hasBanner && <ProtectedImage src={`${API_URL}/api/media/${auth.user.username}/banner?v=${auth.user.imageVersion}`} alt="banner" className={styles.settingsBannerImg} />}
                    </div>
                    <button className={`${styles.settingsBtn} ${imageUploading ? styles.settingsBtnLoading : ""}`} onClick={() => bannerInputRef.current?.click()} disabled={imageUploading}>
                      <span style={imageUploading ? { visibility: "hidden" } : undefined}>Выбрать файл</span>
                      {imageUploading && <span className={styles.settingsBtnSpinner} />}
                    </button>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={handleBannerFileSelect}
                    />
                  </div>
                  <p className={styles.settingsSubHint}>Рекомендуемый размер: 1200×400 px. Форматы: JPG, PNG, WebP, GIF. Максимум 5 МБ.</p>
                  {imageUploadError && <div className={styles.settingsSaveError}>{imageUploadError}</div>}
                  {imageUploadSuccess && (
                    <div className={`${styles.settingsSaveSuccess} ${imageUploadFading ? styles.settingsSaveSuccessFading : ""}`}>
                      Баннер загружен!
                    </div>
                  )}
                </div>
              )}
              {settingsSubTab === "bio" && (
                <div className={styles.settingsSubContent}>
                  <p className={styles.settingsSubLabel}>О себе</p>
                  <textarea
                    className={styles.settingsTextarea}
                    placeholder="Расскажите немного о себе..."
                    rows={4}
                    value={profileBio}
                    onChange={(e) => { setProfileBio(e.target.value); setProfileDirty(true); setProfileSaveSuccess(false); setProfileSaveFading(false); }}
                    maxLength={300}
                  />
                  <p className={styles.settingsSubHint}>Максимум 300 символов. ({profileBio.length}/300)</p>
                  {profileSaveError && <div className={styles.settingsSaveError}>{profileSaveError}</div>}
                  <div className={styles.settingsFooterRow}>
                    {profileSaveSuccess && (
                      <div className={`${styles.settingsSaveSuccess} ${profileSaveFading ? styles.settingsSaveSuccessFading : ""}`}>
                        Сохранено успешно!
                      </div>
                    )}
                    <div className={styles.settingsBtnRow}>
                      <button className={styles.settingsBtnCancel} onClick={handleProfileCancel} disabled={profileSaving}>Отменить</button>
                      <button
                        className={`${styles.settingsBtn} ${profileSaving ? styles.settingsBtnLoading : ""}`}
                        onClick={() => handleProfileSave("bio")}
                        disabled={profileSaving || !profileDirty}
                      >
                        <span style={profileSaving ? { visibility: "hidden" } : undefined}>Сохранить</span>
                        {profileSaving && <span className={styles.settingsBtnSpinner} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {settingsSubTab === "customize" && (
                <div className={styles.settingsSubContent}>
                  <p className={styles.settingsSubLabel}>Эффекты профиля</p>
                  <p className={styles.settingsSubHint}>Включите или отключите визуальные эффекты для вашего публичного профиля.</p>
                  <div className={styles.settingsToggleRow}>
                    <span>Shimmer-эффект</span>
                    <div className={`${styles.settingsToggle} ${custShimmer ? styles.settingsToggleOn : ""}`} onClick={() => { setCustShimmer(!custShimmer); setCustDirty(true); }}>
                      <div className={styles.settingsToggleKnob} />
                    </div>
                  </div>
                  <div className={styles.settingsToggleRow}>
                    <span>Анимированная рамка</span>
                    <div className={`${styles.settingsToggle} ${custBorderGlow ? styles.settingsToggleOn : ""}`} onClick={() => { setCustBorderGlow(!custBorderGlow); setCustDirty(true); }}>
                      <div className={styles.settingsToggleKnob} />
                    </div>
                  </div>
                  <div className={styles.settingsToggleRow}>
                    <span>Свечение аватара</span>
                    <div className={`${styles.settingsToggle} ${custAvatarGlow ? styles.settingsToggleOn : ""}`} onClick={() => { setCustAvatarGlow(!custAvatarGlow); setCustDirty(true); }}>
                      <div className={styles.settingsToggleKnob} />
                    </div>
                  </div>
                  <p className={styles.settingsSubLabel} style={{ marginTop: 20 }}>Акцентный цвет</p>
                  <p className={styles.settingsSubHint}>Установите цвет свечения профиля. Оставьте пустым для цвета по умолчанию.</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="color"
                      value={custAccent || "#a78bfa"}
                      onChange={(e) => { setCustAccent(e.target.value); setCustDirty(true); }}
                      style={{ width: 40, height: 40, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent" }}
                    />
                    <input
                      className={styles.settingsInput}
                      type="text"
                      placeholder="#a78bfa"
                      value={custAccent}
                      onChange={(e) => { setCustAccent(e.target.value); setCustDirty(true); }}
                      maxLength={7}
                      style={{ flex: 1 }}
                    />
                    {custAccent && (
                      <button className={styles.settingsBtnCancel} onClick={() => { setCustAccent(""); setCustDirty(true); }}>Сбросить</button>
                    )}
                  </div>
                  {custSaveError && <div className={styles.settingsSaveError}>{custSaveError}</div>}
                  <div className={styles.settingsFooterRow}>
                    {custSaveSuccess && (
                      <div className={`${styles.settingsSaveSuccess} ${custSaveFading ? styles.settingsSaveSuccessFading : ""}`}>
                        Сохранено успешно!
                      </div>
                    )}
                    <div className={styles.settingsBtnRow}>
                      <button className={styles.settingsBtnCancel} onClick={() => { if (auth.user) { const f = auth.user.effects; setCustShimmer(f?.effectShimmer ?? false); setCustBorderGlow(f?.effectBorderGlow ?? false); setCustAvatarGlow(f?.effectAvatarGlow ?? false); setCustVerified(f?.effectVerifiedBadge ?? false); setCustAccent(f?.accentColor || ""); setCustDirty(false); } }} disabled={custSaving}>Отменить</button>
                      <button
                        className={`${styles.settingsBtn} ${custSaving ? styles.settingsBtnLoading : ""}`}
                        onClick={handleCustSave}
                        disabled={custSaving || !custDirty}
                      >
                        <span style={custSaving ? { visibility: "hidden" } : undefined}>Сохранить</span>
                        {custSaving && <span className={styles.settingsBtnSpinner} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {settingsSubTab === "password" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Текущий пароль</p><input className={styles.settingsInput} type="password" placeholder="Введите текущий пароль" /><p className={styles.settingsSubLabel}>Новый пароль</p><input className={styles.settingsInput} type="password" placeholder="Введите новый пароль" /><p className={styles.settingsSubLabel}>Подтвердите пароль</p><input className={styles.settingsInput} type="password" placeholder="Повторите новый пароль" /><button className={styles.settingsBtn}>Сохранить</button></div>}
              {settingsSubTab === "twofa" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Двухфакторная аутентификация</p><p className={styles.settingsSubHint}>Защитите свой аккаунт с помощью приложения-аутентификатора.</p><button className={styles.settingsBtn}>Включить 2FA</button></div>}
              {settingsSubTab === "sessions" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Активные сессии</p><div className={styles.settingsCard}><div className={styles.settingsCardTitle}>Windows · Chrome</div><div className={styles.settingsCardDesc}>Текущая сессия · Москва, Россия</div></div><p className={styles.settingsSubHint}>Завершите сессии на устройствах, которым вы не доверяете.</p></div>}
              {settingsSubTab === "push" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Push-уведомления в браузере</p><div className={styles.settingsToggleRow}><span>Новые эпизоды</span><div className={styles.settingsToggle}><div className={styles.settingsToggleKnob} /></div></div><div className={styles.settingsToggleRow}><span>Обновления платформы</span><div className={styles.settingsToggle}><div className={styles.settingsToggleKnob} /></div></div></div>}
              {settingsSubTab === "email" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Email для уведомлений</p><input className={styles.settingsInput} type="email" placeholder="your@email.com" /><div className={styles.settingsToggleRow}><span>Еженедельный дайджест</span><div className={styles.settingsToggle}><div className={styles.settingsToggleKnob} /></div></div></div>}
              {settingsSubTab === "releases" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Уведомления о релизах</p><div className={styles.settingsToggleRow}><span>Новые эпизоды отслеживаемых</span><div className={styles.settingsToggle}><div className={styles.settingsToggleKnob} /></div></div><div className={styles.settingsToggleRow}><span>Новые сезоны</span><div className={styles.settingsToggle}><div className={styles.settingsToggleKnob} /></div></div></div>}
              {settingsSubTab === "theme" && (
                <div className={styles.settingsSubContent}>
                  <p className={styles.settingsSubLabel}>Выберите тему</p>
                  <div className={styles.settingsThemeGrid}>
                    <div
                      className={`${styles.settingsThemeOption} ${appearance.theme === "dark" ? styles.settingsThemeActive : ""}`}
                      onClick={() => appearance.setTheme("dark")}
                    >
                      <div className={styles.settingsThemePreviewDark} />
                      <span>Тёмная</span>
                    </div>
                    <div
                      className={`${styles.settingsThemeOption} ${appearance.theme === "light" ? styles.settingsThemeActive : ""}`}
                      onClick={() => appearance.setTheme("light")}
                    >
                      <div className={styles.settingsThemePreviewLight} />
                      <span>Светлая</span>
                    </div>
                  </div>
                </div>
              )}
              {settingsSubTab === "accent" && (
                <div className={styles.settingsSubContent}>
                  <p className={styles.settingsSubLabel}>Акцентный цвет</p>
                  <div className={styles.settingsColorGrid}>
                    {ACCENT_COLORS.map((color) => (
                      <div
                        key={color.name}
                        className={`${styles.settingsColorDot} ${appearance.accent.name === color.name ? styles.settingsColorDotActive : ""}`}
                        style={{ background: color.value }}
                        onClick={() => appearance.setAccent(color)}
                      />
                    ))}
                  </div>
                  <p className={styles.settingsSubHint}>Цвет применяется ко всем элементам интерфейса.</p>
                </div>
              )}
              {settingsSubTab === "font" && (
                <div className={styles.settingsSubContent}>
                  <p className={styles.settingsSubLabel}>Размер шрифта</p>
                  <div className={styles.settingsFontGrid}>
                    <button
                      className={`${styles.settingsFontOption} ${appearance.fontSize === "small" ? styles.settingsFontActive : ""}`}
                      onClick={() => appearance.setFontSize("small")}
                    >
                      <span className={styles.settingsFontPreview} style={{ fontSize: '13px' }}>Аа</span>
                      <span>Маленький</span>
                    </button>
                    <button
                      className={`${styles.settingsFontOption} ${appearance.fontSize === "medium" ? styles.settingsFontActive : ""}`}
                      onClick={() => appearance.setFontSize("medium")}
                    >
                      <span className={styles.settingsFontPreview} style={{ fontSize: '16px' }}>Аа</span>
                      <span>Средний</span>
                    </button>
                    <button
                      className={`${styles.settingsFontOption} ${appearance.fontSize === "large" ? styles.settingsFontActive : ""}`}
                      onClick={() => appearance.setFontSize("large")}
                    >
                      <span className={styles.settingsFontPreview} style={{ fontSize: '19px' }}>Аа</span>
                      <span>Большой</span>
                    </button>
                  </div>
                </div>
              )}
              {settingsSubTab === "language" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Язык интерфейса</p><select className={styles.settingsSelect}><option>Русский</option><option>English</option><option>日本語</option></select></div>}
              {settingsSubTab === "quality" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Качество по умолчанию</p><select className={styles.settingsSelect}><option>1080p</option><option>720p</option><option>480p</option><option>Авто</option></select></div>}
              {settingsSubTab === "autoplay" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Автовоспроизведение</p><div className={styles.settingsToggleRow}><span>Следующий эпизод</span><div className={styles.settingsToggle}><div className={styles.settingsToggleKnob} /></div></div></div>}
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <>
          <div className={`${styles.searchOverlay} ${searchClosing ? styles.overlayClosing : ""}`} onClick={closeSearch} />
          <div className={`${styles.searchModal} ${searchClosing ? styles.searchModalClosing : ""}`}>
            <div className={styles.searchInputWrap}>
              <Search size={20} className={styles.searchInputIcon} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Поиск аниме..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className={styles.searchClear} onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </button>
              )}
              <button className={styles.searchClose} onClick={closeSearch}>
                <X size={18} />
              </button>
            </div>
            {searchLoading && <div className={styles.searchLoader}><div className={styles.searchLoaderBar} /></div>}
            {!searchQuery.trim() && !searchLoading && (
              <div className={styles.searchHint}>Начните вводить название аниме или пользователя</div>
            )}
            {searchQuery.trim() && !searchLoading && searchResults.length === 0 && userResults.length === 0 && (
              <div className={styles.searchHint}>Ничего не найдено</div>
            )}
            {searchResults.length > 0 && !searchLoading && (
              <>
                {userResults.length > 0 && <div className={styles.searchSectionLabel}>Аниме</div>}
                <div className={styles.searchResultsGrid}>
                  {searchResults.map((item) => (
                    <Link
                      key={item.id}
                      href={`/realeses/anime-page/${item.id}`}
                      className={styles.searchCard}
                      onClick={closeSearch}
                    >
                      <div className={styles.searchCardPoster}>
                        <img
                          src={item.poster}
                          alt={item.title}
                          className={styles.searchCardImg}
                        />
                        <span
                          className={styles.searchCardRating}
                          style={{ background: getAccent(item.rating) }}
                        >
                          {item.rating}
                        </span>
                      </div>
                      <div className={styles.searchCardInfo}>
                        <span className={styles.searchCardTitle}>{item.title}</span>
                        <span className={styles.searchCardMeta}>
                          {item.year} • {item.format} • {item.status}
                        </span>
                        <span className={styles.searchCardGenres} style={{ color: getAccent(item.rating) }}>
                          {item.genres}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
            {userResults.length > 0 && !searchLoading && (
              <>
                {searchResults.length > 0 && <div className={styles.searchSectionLabel}>Пользователи</div>}
                <div className={styles.searchUsersList}>
                  {userResults.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.username}`}
                      className={styles.searchUserRow}
                      onClick={closeSearch}
                    >
                      <div className={styles.searchUserAvatar}>
                        {u.hasAvatar ? (
                          <ProtectedImage src={`${API_URL}/api/media/${u.username}/avatar?v=${Date.now()}`} alt={u.displayName} className={styles.searchUserAvatarImg} />
                        ) : (
                          <span className={styles.searchUserInitial}>{(u.displayName || u.username).charAt(0)}</span>
                        )}
                      </div>
                      <div className={styles.searchUserInfo}>
                        <span className={styles.searchUserName}>{u.displayName || u.username}</span>
                        <span className={styles.searchUserHandle}>@{u.username}</span>
                      </div>
                      <span className={styles.searchUserRole} style={{ color: u.role?.color || "#6b7280" }}>{u.role?.displayName}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
      {authOpen && (
        <>
          <div className={`${styles.authOverlay} ${authClosing ? styles.overlayClosingFast : ""}`} onClick={closeAuth} />
          <div className={`${styles.authModal} ${authClosing ? styles.authModalClosing : ""}`}>
            <button className={styles.authClose} onClick={closeAuth}>
              <X size={20} />
            </button>

            <div className={styles.authHeader}>
              <h2 className={styles.authTitle}>
                {authMode === "login" ? "Вход в аккаунт" : "Регистрация"}
              </h2>
              <p className={styles.authSubtitle}>
                {authMode === "login"
                  ? "Войдите, чтобы получить доступ ко всем функциям"
                  : "Создайте аккаунт, чтобы начать"}
              </p>
            </div>

            <div className={styles.authTabs}>
              <div className={`${styles.authTabSlider} ${authMode === "register" ? styles.authTabSliderRight : ""}`} />
              <button
                className={`${styles.authTab} ${authMode === "login" ? styles.authTabActive : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Вход
              </button>
              <button
                className={`${styles.authTab} ${authMode === "register" ? styles.authTabActive : ""}`}
                onClick={() => setAuthMode("register")}
              >
                Регистрация
              </button>
            </div>

            <form className={styles.authForm} key={authMode} onSubmit={handleAuthSubmit}>
              <div className={styles.authFieldAnimated}>
                <label className={styles.authLabel}>Логин</label>
                <div className={styles.authInputWrap}>
                  <User size={16} className={styles.authInputIcon} />
                  <input
                    ref={loginInputRef}
                    type="text"
                    className={styles.authInput}
                    placeholder="Введите логин"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className={styles.authFieldAnimated}>
                <label className={styles.authLabel}>Пароль</label>
                <div className={styles.authInputWrap}>
                  <Lock size={16} className={styles.authInputIcon} />
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    className={styles.authInput}
                    placeholder="Введите пароль"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className={styles.authPasswordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {authMode === "register" && (
                <div className={styles.authFieldAnimated}>
                  <label className={styles.authLabel}>Подтвердите пароль</label>
                  <div className={styles.authInputWrap}>
                    <Lock size={16} className={styles.authInputIcon} />
                    <input
                      ref={confirmPasswordInputRef}
                      type={showPassword ? "text" : "password"}
                      className={styles.authInput}
                      placeholder="Повторите пароль"
                    />
                  </div>
                </div>
              )}

              {authError && <div className={styles.authError}>{authError}</div>}

              <button
                type="submit"
                className={`${styles.authSubmit} ${authLoading ? styles.authSubmitLoading : ""}`}
                disabled={authLoading}
                aria-busy={authLoading}
              >
                <span className={styles.authSubmitLabel}>
                  {authMode === "login" ? "Войти" : "Создать аккаунт"}
                </span>
                <span className={styles.authSubmitSpinner} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="28" height="28">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="56.5"
                      strokeDashoffset="36"
                    />
                  </svg>
                </span>
              </button>
            </form>
          </div>
        </>
      )}
      {bannerCropSrc && (
        <CropModal
          imageSrc={bannerCropSrc}
          aspect={3}
          onApply={handleBannerCropApply}
          onCancel={() => setBannerCropSrc(null)}
        />
      )}
      {friendsOpen && (
        <>
          <div className={styles.searchOverlay} onClick={closeFriends} />
          <div className={`${styles.friendsModal} ${friendsClosing ? styles.friendsModalClosing : ""}`}>
            <div className={styles.friendsHeader}>
              <div className={styles.friendsTabs}>
                <button className={`${styles.friendsTabBtn} ${friendsTab === "friends" ? styles.friendsTabBtnActive : ""}`} onClick={() => setFriendsTab("friends")}>
                  Друзья{friendsList.length > 0 && <span className={styles.friendsTabCount}>{friendsList.length}</span>}
                </button>
                <button className={`${styles.friendsTabBtn} ${friendsTab === "pending" ? styles.friendsTabBtnActive : ""}`} onClick={() => setFriendsTab("pending")}>
                  Запросы{pendingList.length > 0 && <span className={styles.friendsTabCount}>{pendingList.length}</span>}
                </button>
              </div>
              <button className={styles.searchClose} onClick={closeFriends}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.friendsBody}>
              {friendsLoading ? (
                <div className={styles.friendsEmpty}><p>Загрузка...</p></div>
              ) : friendsTab === "friends" ? (
                friendsList.length === 0 ? (
                  <div className={styles.friendsEmpty}>
                    <Users size={48} strokeWidth={1.2} />
                    <p>У вас пока нет друзей</p>
                    <span>Добавляйте друзей через их профили</span>
                  </div>
                ) : (
                  <div className={styles.friendsGrid}>
                    {friendsList.map((f: any) => {
                      const hasEffect = f.effectShimmer || f.effectBorderGlow || f.effectAvatarGlow || f.effectVerifiedBadge;
                      return (
                        <Link key={f.id} href={`/profile/${f.username}`} onClick={closeFriends} className={`${styles.friendCard}${hasEffect ? ` ${styles.friendCardPrivileged}` : ""}`} style={getFriendCardStyle(f)}>
                          <div className={styles.friendCardBanner}>
                            {f.hasBanner ? (
                              <ProtectedImage src={`${API_URL}/api/media/${f.username}/banner`} alt="" className={styles.friendCardBannerImg} />
                            ) : (
                              <div className={styles.friendCardBannerFallback} />
                            )}
                            <div className={styles.friendCardBannerOverlay} />
                            {f.effectShimmer && <div className={styles.friendCardShimmer} />}
                            {f.effectBorderGlow && <div className={styles.friendCardGlow} />}
                          </div>
                          <div className={styles.friendCardBody}>
                            <div className={`${styles.friendAvatar}${f.effectAvatarGlow ? ` ${styles.friendAvatarGlow}` : ""}`}>
                              {f.hasAvatar ? (
                                <ProtectedImage src={`${API_URL}/api/media/${f.username}/avatar`} alt={f.displayName} className={styles.friendAvatarImg} />
                              ) : (
                                <span>{f.displayName.charAt(0)}</span>
                              )}
                            </div>
                            <div className={styles.friendInfo}>
                              <span className={styles.friendName}>{f.displayName}</span>
                              <span className={styles.friendHandle}>@{f.username}</span>
                              <span className={styles.friendRoleBadge} style={{ color: f.role?.color, borderColor: f.role?.color }}>{f.role?.displayName}</span>
                            </div>
                          </div>
                          <button className={styles.friendRemoveBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRejectFriend(f.username); }} title="Удалить">
                            <X size={14} />
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : (
                pendingList.length === 0 ? (
                  <div className={styles.friendsEmpty}>
                    <Bell size={48} strokeWidth={1.2} />
                    <p>Нет входящих запросов</p>
                  </div>
                ) : (
                  <div className={styles.friendsGrid}>
                    {pendingList.map((f: any) => {
                      const hasEffect = f.effectShimmer || f.effectBorderGlow || f.effectAvatarGlow || f.effectVerifiedBadge;
                      return (
                        <div key={f.id} className={`${styles.friendCard}${hasEffect ? ` ${styles.friendCardPrivileged}` : ""}`} style={getFriendCardStyle(f)}>
                          <div className={styles.friendCardBanner}>
                            {f.hasBanner ? (
                              <ProtectedImage src={`${API_URL}/api/media/${f.username}/banner`} alt="" className={styles.friendCardBannerImg} />
                            ) : (
                              <div className={styles.friendCardBannerFallback} />
                            )}
                            <div className={styles.friendCardBannerOverlay} />
                            {f.effectShimmer && <div className={styles.friendCardShimmer} />}
                            {f.effectBorderGlow && <div className={styles.friendCardGlow} />}
                          </div>
                          <div className={styles.friendCardBody}>
                            <div className={`${styles.friendAvatar}${f.effectAvatarGlow ? ` ${styles.friendAvatarGlow}` : ""}`}>
                              {f.hasAvatar ? (
                                <ProtectedImage src={`${API_URL}/api/media/${f.username}/avatar`} alt={f.displayName} className={styles.friendAvatarImg} />
                              ) : (
                                <span>{f.displayName.charAt(0)}</span>
                              )}
                            </div>
                            <div className={styles.friendInfo}>
                              <span className={styles.friendName}>{f.displayName}</span>
                              <span className={styles.friendHandle}>@{f.username}</span>
                            </div>
                            <div className={styles.friendPendingActions}>
                              <button className={styles.friendAcceptBtn} onClick={() => handleAcceptFriend(f.username)} title="Принять">Принять</button>
                              <button className={styles.friendRejectBtn} onClick={() => handleRejectFriend(f.username)} title="Отклонить">Отклонить</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}

      {bookmarksOpen && (
        <>
          <div className={styles.searchOverlay} onClick={closeBookmarks} />
          <div className={`${styles.bookmarksModal} ${bookmarksClosing ? styles.bookmarksModalClosing : ""}`}>
            <div className={styles.bookmarksHeader}>
              <div className={styles.bookmarksTabs} ref={bmTabsRef}>
                {[
                  { key: "favorites", label: "Избранное" },
                  { key: "watching", label: "Смотрю" },
                  { key: "planned", label: "В планах" },
                  { key: "completed", label: "Просмотренно" },
                  { key: "onhold", label: "Отложенно" },
                  { key: "dropped", label: "Брошенно" },
                ].map((t) => (
                  <button
                    key={t.key}
                    data-active={bookmarksTab === t.key}
                    className={`${styles.bookmarksTabBtn} ${bookmarksTab === t.key ? styles.bookmarksTabBtnActive : ""}`}
                    onClick={() => setBookmarksTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
                <div className={styles.bmTabIndicator} style={{ left: bmIndicator.left, width: bmIndicator.width }} />
              </div>
              <button className={styles.searchClose} onClick={closeBookmarks}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.bookmarksBody} key={bookmarksTab}>
              {(() => {
                const tabAnimeMap: Record<string, number[]> = {
                  favorites: [1, 3, 7],
                  watching: [7, 8],
                  planned: [2, 5, 6],
                  completed: [1, 4],
                  onhold: [3],
                  dropped: [6],
                };
                const ids = tabAnimeMap[bookmarksTab] || [];
                const items = animeCatalog.filter((a) => ids.includes(a.id));
                if (items.length === 0) {
                  return (
                    <div className={styles.bookmarksEmpty}>
                      <Bookmark size={48} strokeWidth={1.2} />
                      <p>Пока пусто</p>
                      <span>Добавляйте аниме через страницу релиза</span>
                    </div>
                  );
                }
                return (
                  <div className={styles.bookmarksGrid}>
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        href={`/realeses/anime-page/${item.id}`}
                        className={styles.bookmarkCard}
                        onClick={closeBookmarks}
                      >
                        <div className={styles.bookmarkCardPoster}>
                          <img src={item.poster} alt={item.title} className={styles.bookmarkCardImg} />
                          <div className={styles.bookmarkCardAccent} style={{ background: getAccent(item.rating) }} />
                          <span className={styles.bookmarkCardRating}>{item.rating}</span>
                        </div>
                        <div className={styles.bookmarkCardInfo}>
                          <span className={styles.bookmarkCardTitle}>{item.title}</span>
                          <span className={styles.bookmarkCardMeta}>{item.meta}</span>
                          <span className={styles.bookmarkCardGenres} style={{ color: getAccent(item.rating) }}>{item.genres}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Friend request notifications */}
      {friendNotifs.length > 0 && (
        <div className={styles.notifContainer}>
          {friendNotifs.map((f: any) => (
            <div key={f.id} className={styles.notifToast}>
              <div className={styles.notifBody}>
                <div className={styles.notifAvatar}>
                  {f.hasAvatar ? (
                    <ProtectedImage src={`${API_URL}/api/media/${f.username}/avatar`} alt={f.displayName} className={styles.notifAvatarImg} />
                  ) : (
                    <span>{f.displayName.charAt(0)}</span>
                  )}
                </div>
                <div className={styles.notifText}>
                  <span className={styles.notifName}>{f.displayName}</span>
                  <span className={styles.notifHandle}>@{f.username}</span>
                  <span className={styles.notifMsg}>хочет добавить вас в друзья!</span>
                </div>
                <button className={styles.notifClose} onClick={() => dismissNotif(f.id)}>
                  <X size={14} />
                </button>
              </div>
              <div className={styles.notifActions}>
                <button className={styles.notifAccept} onClick={() => handleNotifAccept(f)}>Принять</button>
                <button className={styles.notifReject} onClick={() => handleNotifReject(f)}>Отклонить</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

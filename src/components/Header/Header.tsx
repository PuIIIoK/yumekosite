"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Search, Settings, Heart, X, User, Bell, Palette, Shield, LogOut, ChevronRight, ArrowLeft } from "lucide-react";
import { animeCatalog, getAccent } from "@/data/anime";
import { useAppearance, ACCENT_COLORS, type ThemeMode, type FontSize } from "@/context/AppearanceContext";
import styles from "./Header.module.scss";

export default function Header() {
  const pathname = usePathname();
  const isReleasesActive = pathname.startsWith("/realeses") || pathname.startsWith("/releases");
  const appearance = useAppearance();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");
  const [settingsSubTab, setSettingsSubTab] = useState<string | null>(null);
  const [settingsAnimating, setSettingsAnimating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(animeCatalog.slice(0, 0));
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        setSearchOpen(false);
        setSettingsOpen(false);
      }
    };
    if (searchOpen || settingsOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [searchOpen, settingsOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const results = animeCatalog.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.altTitle.toLowerCase().includes(q) ||
          a.genres.toLowerCase().includes(q)
      );
      setSearchResults(results);
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
    profile: { username: "Имя пользователя", avatar: "Аватар", bio: "О себе" },
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

        {/* Right */}
        <div className={styles.right}>
          <Link href="/support" className={styles.supportLink}>
            <Heart size={15} strokeWidth={2.5} />
            Поддержать
          </Link>
          <div className={styles.divider} />
          <button className={styles.iconBtn} aria-label="Закладки">
            <BookMarked size={20} />
          </button>
          <button className={styles.iconBtn} aria-label="Поиск" onClick={() => setSearchOpen(true)}>
            <Search size={20} />
          </button>
          <button className={styles.iconBtn} aria-label="Настройки" onClick={() => setSettingsOpen(true)}>
            <Settings size={20} />
          </button>
          <div className={styles.avatar} />
        </div>

      </div>

      {/* Search Modal */}
      {/* Settings Modal */}
      {settingsOpen && (
        <div className={styles.settingsModal}>
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

            <button className={`${styles.settingsItem} ${styles.settingsItemDanger}`} style={{ marginTop: 'auto' }}>
              <LogOut size={18} /> Выйти
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
              <button className={styles.searchClose} onClick={() => { setSettingsOpen(false); setSettingsTab("profile"); setSettingsSubTab(null); }}>
                <X size={20} />
              </button>
            </div>
            <div
              className={`${styles.settingsBody} ${settingsAnimating ? styles.settingsBodyOut : styles.settingsBodyIn}`}
              key={`${settingsTab}-${settingsSubTab}`}
            >
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
                  <div className={styles.settingsCard} onClick={() => openSubTab("bio")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>О себе</div>
                      <div className={styles.settingsCardDesc}>Расскажите немного о себе. Эта информация будет видна в вашем профиле.</div></div>
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
                  <div className={styles.settingsCard} onClick={() => openSubTab("twofa")}>
                    <div className={styles.settingsCardInner}>
                      <div><div className={styles.settingsCardTitle}>Двухфакторная аутентификация</div>
                      <div className={styles.settingsCardDesc}>Добавьте дополнительный уровень защиты с помощью 2FA.</div></div>
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
              {settingsSubTab === "username" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Отображаемое имя</p><input className={styles.settingsInput} type="text" placeholder="Введите имя пользователя" /><p className={styles.settingsSubHint}>Имя будет видно другим пользователям на платформе.</p></div>}
              {settingsSubTab === "avatar" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>Загрузка аватара</p><div className={styles.settingsAvatarUpload}><div className={styles.settingsAvatarPreview} /><button className={styles.settingsBtn}>Выбрать файл</button></div><p className={styles.settingsSubHint}>Рекомендуемый размер: 256×256 px. Форматы: JPG, PNG, WebP.</p></div>}
              {settingsSubTab === "bio" && <div className={styles.settingsSubContent}><p className={styles.settingsSubLabel}>О себе</p><textarea className={styles.settingsTextarea} placeholder="Расскажите немного о себе..." rows={4} /><p className={styles.settingsSubHint}>Максимум 200 символов.</p></div>}
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
          <div className={styles.searchOverlay} onClick={() => setSearchOpen(false)} />
          <div className={styles.searchModal}>
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
              <button className={styles.searchClose} onClick={() => setSearchOpen(false)}>
                <X size={18} />
              </button>
            </div>
            {searchLoading && <div className={styles.searchLoader}><div className={styles.searchLoaderBar} /></div>}
            {!searchQuery.trim() && !searchLoading && (
              <div className={styles.searchHint}>Начните вводить название аниме</div>
            )}
            {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
              <div className={styles.searchHint}>Ничего не найдено</div>
            )}
            {searchResults.length > 0 && !searchLoading && (
              <div className={styles.searchResultsList}>
                {searchResults.map((item) => (
                  <Link
                    key={item.id}
                    href={`/realeses/anime-page/${item.id}`}
                    className={styles.searchResultItem}
                    onClick={() => setSearchOpen(false)}
                  >
                    <div
                      className={styles.searchResultPoster}
                      style={{ borderColor: `${getAccent(item.rating)}33` }}
                    >
                      <span className={styles.searchResultPosterLabel}>{item.rating}</span>
                    </div>
                    <div className={styles.searchResultInfo}>
                      <span className={styles.searchResultTitle}>{item.title}</span>
                      <span className={styles.searchResultAlt}>{item.altTitle}</span>
                      <span className={styles.searchResultMeta}>
                        {item.year} • {item.format} • {item.status}
                      </span>
                      <span className={styles.searchResultGenres} style={{ color: getAccent(item.rating) }}>
                        {item.genres}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}

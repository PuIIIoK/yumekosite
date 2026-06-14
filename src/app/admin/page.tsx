"use client";

import {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header/Header";
import {
  Shield,
  Users,
  Film,
  Play,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  Handshake,
} from "lucide-react";
import AnimeManager from "./AnimeManager";
import UserManager from "./UserManager";
import EpisodeManager from "./EpisodeManager";
import BannerManager from "./BannerManager";
import StudioManager from "./StudioManager";
import styles from "./admin.module.scss";

const ADMIN_SECTIONS = [
  {
    id: "banner",
    title: "Баннер",
    icon: LayoutDashboard,
    color: "#f59e0b",
    minPriority: 100,
  },
  {
    id: "anime",
    title: "Аниме каталог",
    icon: Film,
    color: "#a855f7",
    minPriority: 80,
  },
  {
    id: "episodes",
    title: "Эпизоды",
    icon: Play,
    color: "#10b981",
    minPriority: 90,
  },
  {
    id: "studios",
    title: "Коллаборация",
    icon: Handshake,
    color: "#ef4444",
    minPriority: 120,
  },
  {
    id: "users",
    title: "Пользователи",
    icon: Users,
    color: "#3b82f6",
    minPriority: 150,
  },
];

function getMaxPriority(
  user: { role?: { priority: number }; roles?: { priority: number }[] } | null,
): number {
  if (!user) return 0;
  const rolePriorities = (user.roles ?? [user.role].filter(Boolean)).map(
    (r) => r?.priority ?? 0,
  );
  return Math.max(0, ...rolePriorities);
}

function AdminContent({ section }: { section: string }) {
  if (section === "banner") return <BannerManager />;
  if (section === "anime") return <AnimeManager />;
  if (section === "episodes") return <EpisodeManager />;
  if (section === "studios") return <StudioManager />;
  if (section === "users") return <UserManager />;
  const matched = ADMIN_SECTIONS.find((s) => s.id === section);
  if (!matched) return null;
  const Icon = matched.icon;
  return (
    <div className={styles.contentPlaceholder}>
      <Icon
        size={48}
        strokeWidth={1.2}
        style={{ color: matched.color, opacity: 0.5 }}
      />
      <h2>{matched.title}</h2>
      <p>Раздел в разработке</p>
    </div>
  );
}

export default function AdminPage() {
  const auth = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSectionState] = useState("anime");

  const [tabFading, setTabFading] = useState(false);
  const [visualSection, setVisualSection] = useState("anime");

  const setActiveSection = (id: string) => {
    if (id === activeSection) return;
    setVisualSection(id);
    setTabFading(true);
    setTimeout(() => {
      setActiveSectionState(id);
      window.history.replaceState(null, "", `/admin#${id}`);
      setTabFading(false);
    }, 200);
  };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, opacity: 0 });

  const updateIndicator = useCallback(() => {
    if (!navRef.current) return;
    const active = navRef.current.querySelector(
      `[data-section="${visualSection}"]`,
    ) as HTMLElement | null;
    if (active) {
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = active.getBoundingClientRect();
      setIndicator({
        top: btnRect.top - navRect.top,
        height: btnRect.height,
        opacity: 1,
      });
    }
  }, [visualSection]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [visualSection, sidebarOpen, updateIndicator]);

  useEffect(() => {
    if (!auth.mounted) return;
    if (!auth.isAuthenticated) {
      router.replace("/");
      return;
    }
    const priority = getMaxPriority(auth.user);
    if (priority < 80) {
      router.replace("/");
      return;
    }
    const visibleSections = ADMIN_SECTIONS.filter(
      (s) => priority >= s.minPriority,
    );
    const hash = window.location.hash.replace("#", "");
    if (hash && visibleSections.some((s) => s.id === hash)) {
      setActiveSectionState(hash);
      setVisualSection(hash);
    } else if (visibleSections.length > 0) {
      setActiveSectionState(visibleSections[0].id);
      setVisualSection(visibleSections[0].id);
    }
    setLoading(false);
  }, [auth.mounted, auth.isAuthenticated, auth.user, router]);

  if (loading || !auth.user) {
    return (
      <>
        <Header />
        <main className={styles.adminWrap}>
          <div className={styles.loader}>Загрузка...</div>
        </main>
      </>
    );
  }

  const roleName =
    auth.user.role?.displayName || auth.user.role?.name || "Staff";

  return (
    <>
      <Header />
      <main className={styles.adminWrap}>
        <aside
          className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
        >
          <div className={styles.sidebarHeader}>
            {sidebarOpen && (
              <div className={styles.sidebarBrand}>
                <Shield size={20} className={styles.sidebarBrandIcon} />
                <span>Админ панель</span>
              </div>
            )}
            <button
              className={styles.sidebarToggle}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose size={18} />
              ) : (
                <PanelLeft size={18} />
              )}
            </button>
          </div>

          <nav className={styles.sidebarNav} ref={navRef}>
            <div
              className={styles.sidebarIndicator}
              style={
                {
                  transform: `translateY(${indicator.top}px)`,
                  height: indicator.height,
                  opacity: indicator.opacity,
                  "--indicator-color":
                    ADMIN_SECTIONS.find((s) => s.id === visualSection)?.color ||
                    "var(--accent)",
                } as React.CSSProperties
              }
            />
            {ADMIN_SECTIONS.filter(
              (s) => getMaxPriority(auth.user) >= s.minPriority,
            ).map((section) => {
              const Icon = section.icon;
              const isActive = visualSection === section.id;
              return (
                <button
                  key={section.id}
                  data-section={section.id}
                  className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ""}`}
                  onClick={() => setActiveSection(section.id)}
                  title={sidebarOpen ? undefined : section.title}
                  style={
                    { "--item-color": section.color } as React.CSSProperties
                  }
                >
                  <Icon size={18} />
                  {sidebarOpen && <span>{section.title}</span>}
                </button>
              );
            })}
          </nav>

          {sidebarOpen && (
            <div className={styles.sidebarFooter}>
              <span className={styles.sidebarUser}>
                {auth.user.displayName}
              </span>
              <span
                className={styles.sidebarRole}
                style={{ color: auth.user.role?.color }}
              >
                {roleName}
              </span>
            </div>
          )}
        </aside>

        <div
          className={`${styles.content} ${sidebarOpen ? styles.contentShifted : styles.contentFull}`}
        >
          <div
            className={`${styles.tabContent} ${tabFading ? styles.tabContentOut : styles.tabContentIn}`}
          >
            <AdminContent section={activeSection} />
          </div>
        </div>
      </main>
    </>
  );
}

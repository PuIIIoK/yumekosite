"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookMarked, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./MobileNavBar.module.scss";

interface NavItem {
  key: string;
  label: string;
  href: string;
  Icon: React.ElementType;
}

export default function MobileNavBar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [activeKey, setActiveKey] = useState("home");

  useEffect(() => {
    if (pathname === "/" || pathname === "") {
      setActiveKey("home");
    } else if (pathname.startsWith("/realeses/collections")) {
      setActiveKey("collections");
    } else if (pathname.startsWith("/profile")) {
      setActiveKey("profile");
    }
  }, [pathname]);

  const getProfileHref = () => {
    if (user?.username) {
      return `/profile/${user.username}`;
    }
    return "/profile";
  };

  const NAV_ITEMS: NavItem[] = [
    { key: "home", label: "Главная", href: "/", Icon: Home },
    {
      key: "collections",
      label: "Мои коллекции",
      href: isAuthenticated ? "/realeses/collections" : "/",
      Icon: BookMarked,
    },
    {
      key: "profile",
      label: "Мой профиль",
      href: getProfileHref(),
      Icon: User,
    },
  ];

  return (
    <nav className={styles.mobileNavBar}>
      <div className={styles.navInner}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeKey === item.key;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
            >
              <div className={styles.navIcon}>
                <item.Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && <div className={styles.navIconGlow} />}
              </div>
              <span className={styles.navLabel}>{item.label}</span>
              {isActive && <div className={styles.navIndicator} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

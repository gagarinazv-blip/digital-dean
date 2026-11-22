"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  Journal,
  GraphUp,
  HomeSimple,
  Menu,
  Page,
  SidebarCollapse,
  SidebarExpand,
  Suitcase,
  TaskList,
  User,
  Xmark,
} from "iconoir-react";
import { useEffect, useRef, useState } from "react";
import { UnreadNotificationBadge } from "@/components/unread-notification-badge";
import {
  CAMPUS_SIDEBAR_COLLAPSED,
  CAMPUS_SIDEBAR_COOKIE,
} from "@/lib/campus-sidebar";
import { useStudentNotificationStore } from "@/lib/notification-store";
import styles from "./campus-navigation.module.css";

const navigation = [
  { href: "/", label: "Сегодня", icon: HomeSimple },
  { href: "/schedule", label: "Расписание", icon: Calendar },
  { href: "/deadlines", label: "Задания", icon: TaskList },
  { href: "/digest", label: "Дайджест событий", icon: Journal },
  { href: "/grades", label: "Успеваемость", icon: GraphUp },
  { href: "/documents", label: "Документы и заявки", icon: Page },
  { href: "/opportunities/catalog", label: "Возможности", icon: Suitcase },
  { href: "/notifications", label: "Уведомления", icon: Bell },
  { href: "/profile", label: "Профиль", icon: User },
] as const;

const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

export function CampusNavigation({
  initiallyCollapsed = false,
  studentId,
  unreadNotificationCount,
}: {
  initiallyCollapsed?: boolean;
  studentId: number;
  unreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
  const toggleLabel = isCollapsed ? "Развернуть меню" : "Свернуть меню";
  const ToggleIcon = isCollapsed ? SidebarExpand : SidebarCollapse;
  const { unreadCount } = useStudentNotificationStore(
    studentId,
    unreadNotificationCount,
  );
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    document.cookie = `${CAMPUS_SIDEBAR_COOKIE}=${
      next ? CAMPUS_SIDEBAR_COLLAPSED : "expanded"
    }; path=/; max-age=${YEAR_IN_SECONDS}; samesite=lax`;
  }

  return (
    <>
      <button
        aria-controls="campus-mobile-navigation"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
        className={styles.mobileMenuButton}
        onClick={() => setMobileOpen((open) => !open)}
        ref={menuButtonRef}
        type="button"
      >
        {mobileOpen ? (
          <Xmark aria-hidden="true" strokeWidth={1.8} />
        ) : (
          <Menu aria-hidden="true" strokeWidth={1.8} />
        )}
      </button>
      {mobileOpen && (
        <button
          aria-label="Закрыть меню"
          className={styles.mobileBackdrop}
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      )}
      <nav
        className={`${styles.navigation} ${
          mobileOpen ? styles.mobileOpen : ""
        }`}
        data-collapsed={isCollapsed}
        id="campus-mobile-navigation"
        aria-label="Разделы кабинета"
      >
        <button
          aria-controls="campus-mobile-navigation"
          aria-expanded={!isCollapsed}
          aria-label={toggleLabel}
          className={styles.collapseButton}
          onClick={toggleCollapsed}
          title={toggleLabel}
          type="button"
        >
          <span className={styles.icon}>
            <ToggleIcon
              aria-hidden="true"
              className={styles.iconSvg}
              strokeWidth={1.8}
            />
          </span>
          <span className={styles.navigationLabel}>{toggleLabel}</span>
        </button>
        {navigation.map((item) => {
          const isCurrent =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ||
            (item.href === "/documents" && pathname.startsWith("/help"));

          return (
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className={`${styles.navigationLink} ${isCurrent ? styles.active : ""}`}
              href={item.href}
              key={item.href}
              onClick={() => setMobileOpen(false)}
              title={item.label}
            >
              <span className={styles.icon}>
                <item.icon
                  aria-hidden="true"
                  className={styles.iconSvg}
                  strokeWidth={1.8}
                />
              </span>
              <span className={styles.navigationLabel}>{item.label}</span>
              {item.href === "/notifications" && (
                <UnreadNotificationBadge
                  className={styles.unreadBadge}
                  count={unreadCount}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

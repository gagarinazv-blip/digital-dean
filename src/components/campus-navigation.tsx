"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  GraphUp,
  HomeSimple,
  Menu,
  Page,
  TaskList,
  User,
  Xmark,
} from "iconoir-react";
import { useEffect, useRef, useState } from "react";
import styles from "./campus-navigation.module.css";

const navigation = [
  { href: "/", label: "Сегодня", icon: HomeSimple },
  { href: "/schedule", label: "Расписание", icon: Calendar },
  { href: "/digest", label: "Дайджест событий", icon: Calendar },
  { href: "/grades", label: "Успеваемость", icon: GraphUp },
  { href: "/documents", label: "Документы и заявки", icon: Page },
  { href: "/opportunities/catalog", label: "Возможности", icon: TaskList },
  { href: "/notifications", label: "Уведомления", icon: Bell },
  { href: "/profile", label: "Профиль", icon: User },
] as const;
const unreadCountEvent = "campus:unread-notification-count";

export function CampusNavigation({
  unreadNotificationCount,
}: {
  unreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(unreadNotificationCount);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleUnreadCount = (event: Event) => {
      const count = (event as CustomEvent<unknown>).detail;
      if (
        typeof count === "number" &&
        Number.isSafeInteger(count) &&
        count >= 0
      ) {
        setUnreadCount(count);
      }
    };
    window.addEventListener(unreadCountEvent, handleUnreadCount);
    return () => window.removeEventListener(unreadCountEvent, handleUnreadCount);
  }, []);

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
        id="campus-mobile-navigation"
        aria-label="Разделы кабинета"
      >
        {navigation.map((item) => {
          const isCurrent =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ||
            (item.href === "/documents" && pathname.startsWith("/help"));

          return (
            <Link
              aria-label={
                item.href === "/notifications" && unreadCount > 0
                  ? `Уведомления, непрочитанных: ${unreadCount}`
                  : item.label
              }
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
                {item.href === "/notifications" && unreadCount > 0 && (
                  <span aria-hidden="true" className={styles.unreadBadge}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span className={styles.navigationLabel}>{item.label}</span>
              {item.href === "/notifications" && unreadCount > 0 && (
                <span aria-hidden="true" className={styles.desktopUnreadBadge}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

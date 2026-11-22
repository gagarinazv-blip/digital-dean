"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./campus-navigation.module.css";

const navigation = [
  { href: "/", label: "Сегодня", icon: "home" },
  { href: "/schedule", label: "Расписание", icon: "calendar" },
  { href: "/digest", label: "Дайджест событий", icon: "digest" },
  { href: "/grades", label: "Успеваемость", icon: "chart" },
  { href: "/documents", label: "Документы", icon: "page" },
  { href: "/requests", label: "Заявки", icon: "request" },
  { href: "/notifications", label: "Уведомления", icon: "bell" },
  { href: "/profile", label: "Профиль", icon: "profile" },
] as const;

const iconPaths: Record<(typeof navigation)[number]["icon"], ReactNode> = {
  home: (
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  digest: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M8 14h3m-3 3h7" />
      <path d="m17 13 .7 1.4 1.5.2-1.1 1.1.3 1.5-1.4-.7-1.3.7.2-1.5-1.1-1.1 1.5-.2z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h17" />
      <path d="m7 15 4-4 3 2 6-7" />
    </>
  ),
  page: (
    <>
      <path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5M8 13h8M8 17h8" />
    </>
  ),
  request: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8m-8 4h4" />
      <path d="m15 17 2 2 4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

const unreadCountEvent = "campus:unread-notification-count";

function NavigationIcon({
  name,
}: {
  name: (typeof navigation)[number]["icon"];
}) {
  return (
    <svg
      aria-hidden="true"
      className={styles.iconSvg}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {iconPaths[name]}
    </svg>
  );
}

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
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          {mobileOpen ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
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
              item.href === "/notifications" &&
              unreadCount > 0
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
              <NavigationIcon name={item.icon} />
              {item.href === "/notifications" &&
                unreadCount > 0 && (
                  <span aria-hidden="true" className={styles.unreadBadge}>
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
            </span>
            <span className={styles.navigationLabel}>{item.label}</span>
            {item.href === "/notifications" &&
              unreadCount > 0 && (
                <span aria-hidden="true" className={styles.desktopUnreadBadge}>
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./campus-navigation.module.css";

const navigation = [
  { href: "/", label: "Сегодня", icon: "home" },
  { href: "/schedule", label: "Расписание", icon: "calendar" },
  { href: "/grades", label: "Успеваемость", icon: "chart" },
  { href: "/help", label: "Справки и обращения", icon: "page" },
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
          (item.href === "/help" && pathname.startsWith("/requests"));

          return (
            <Link
            aria-label={
              item.href === "/notifications" &&
              unreadNotificationCount > 0
                ? `Уведомления, непрочитанных: ${unreadNotificationCount}`
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
                unreadNotificationCount > 0 && (
                  <span aria-hidden="true" className={styles.unreadBadge}>
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
            </span>
            <span className={styles.navigationLabel}>{item.label}</span>
            {item.href === "/notifications" &&
              unreadNotificationCount > 0 && (
                <span aria-hidden="true" className={styles.desktopUnreadBadge}>
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

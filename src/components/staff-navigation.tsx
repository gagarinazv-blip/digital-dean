"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./staff-layout.module.css";

const navigationItems = [
  { href: "/staff", label: "Заявки", icon: "requests" },
  { href: "/staff/students", label: "Студенты", icon: "students" },
  { href: "/staff/events", label: "Дайджест событий", icon: "events" },
] as const;

export function StaffNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="Разделы сотрудника">
      <p className={styles.navigationTitle}>Рабочее место</p>
      {navigationItems.map((item) => {
        const isCurrent =
          pathname === item.href ||
          (item.href === "/staff/students" &&
            pathname.startsWith("/staff/students/")) ||
          (item.href === "/staff/events" &&
            pathname.startsWith("/staff/events/")) ||
          (item.href === "/staff" &&
            (pathname.startsWith("/staff/requests") ||
              pathname === "/staff"));
        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={styles.navigationLink}
            href={item.href}
            key={item.href}
            title={item.label}
          >
            <svg
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              {item.icon === "requests" ? (
                <>
                  <rect x="5" y="5" width="14" height="16" rx="2" />
                  <path d="M9 5V3h6v2M8 12l2 2 5-5" />
                </>
              ) : item.icon === "students" ? (
                <>
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" />
                </>
              ) : (
                <>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 10h18M8 14h3m-3 3h7" />
                </>
              )}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

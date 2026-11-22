"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraphUp, TaskList, User } from "iconoir-react";
import styles from "./staff-layout.module.css";

const navigationItems = [
  { href: "/staff", label: "Заявки", icon: TaskList },
  { href: "/staff/students", label: "Студенты", icon: User },
  { href: "/staff/achievements", label: "Достижения", icon: GraphUp },
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
          (item.href === "/staff/achievements" &&
            pathname.startsWith("/staff/achievements")) ||
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
            <item.icon
              aria-hidden="true"
<<<<<<< HEAD
              strokeWidth={1.8}
            />
=======
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
                  <path d="M4 5h16v14H4z" />
                  <path d="m8 15 2.5-3 2 2 2.5-4 3 5M8 8h.01" />
                </>
              )}
            </svg>
>>>>>>> 92f7d6e (feat: add secure student portfolio)
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

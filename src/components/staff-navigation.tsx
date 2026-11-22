"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TaskList, User } from "iconoir-react";
import styles from "./staff-layout.module.css";

const navigationItems = [
  { href: "/staff", label: "Заявки", icon: "requests" },
  { href: "/staff/students", label: "Студенты", icon: "students" },
  { href: "/staff/achievements", label: "Достижения", icon: "achievements" },
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
            {item.icon === "requests" ? (
              <TaskList aria-hidden="true" strokeWidth={1.8} />
            ) : item.icon === "students" ? (
              <User aria-hidden="true" strokeWidth={1.8} />
            ) : (
              <svg
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M4 5h16v14H4z" />
                <path d="m8 15 2.5-3 2 2 2.5-4 3 5M8 8h.01" />
              </svg>
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

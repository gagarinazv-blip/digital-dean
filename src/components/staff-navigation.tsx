"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, GraphUp, TaskList, User } from "iconoir-react";
import styles from "./staff-layout.module.css";

const navigationItems = [
  { href: "/staff", label: "Заявки", icon: TaskList },
  { href: "/staff/students", label: "Студенты", icon: User },
  { href: "/staff/achievements", label: "Достижения", icon: GraphUp },
  { href: "/staff/events", label: "Дайджест событий", icon: Calendar },
  { href: "/staff/opportunities", label: "Возможности", icon: TaskList },
  {
    href: "/staff/certificate-forms",
    label: "Формы справок",
    icon: TaskList,
    managerOnly: true,
  },
] as const;

export function StaffNavigation({
  isManagerAccount,
}: {
  isManagerAccount: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="Разделы сотрудника">
      <p className={styles.navigationTitle}>Рабочее место</p>
      {navigationItems
        .filter((item) => !("managerOnly" in item) || isManagerAccount)
        .map((item) => {
        const isCurrent =
          pathname === item.href ||
          (item.href === "/staff/students" &&
            pathname.startsWith("/staff/students/")) ||
          (item.href === "/staff/achievements" &&
            pathname.startsWith("/staff/achievements")) ||
          (item.href === "/staff/achievements" &&
            pathname.startsWith("/staff/achievements")) ||
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
            <item.icon
              aria-hidden="true"
              strokeWidth={1.8}
            />
            {item.label}
          </Link>
        );
        })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Group,
  PageEdit,
  SidebarCollapse,
  SidebarExpand,
  Suitcase,
  TaskList,
  Trophy,
} from "iconoir-react";
import { useState } from "react";
import {
  STAFF_SIDEBAR_COLLAPSED,
  STAFF_SIDEBAR_COOKIE,
} from "@/lib/staff-sidebar";
import styles from "./staff-layout.module.css";

const navigationItems = [
  { href: "/staff", label: "Заявки", icon: TaskList },
  { href: "/staff/students", label: "Студенты", icon: Group },
  { href: "/staff/achievements", label: "Достижения", icon: Trophy },
  { href: "/staff/events", label: "Дайджест событий", icon: Calendar },
  { href: "/staff/opportunities", label: "Возможности", icon: Suitcase },
  {
    href: "/staff/certificate-forms",
    label: "Виды справок",
    icon: PageEdit,
    managerOnly: true,
  },
] as const;

const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

export function StaffNavigation({
  initiallyCollapsed,
  isManagerAccount,
}: {
  initiallyCollapsed: boolean;
  isManagerAccount: boolean;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
  const toggleLabel = isCollapsed ? "Развернуть меню" : "Свернуть меню";
  const ToggleIcon = isCollapsed ? SidebarExpand : SidebarCollapse;

  function toggle() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    document.cookie = `${STAFF_SIDEBAR_COOKIE}=${
      next ? STAFF_SIDEBAR_COLLAPSED : "expanded"
    }; path=/staff; max-age=${YEAR_IN_SECONDS}; samesite=lax`;
  }

  return (
    <nav
      aria-label="Разделы сотрудника"
      className={styles.navigation}
      data-collapsed={isCollapsed}
      id="staff-navigation"
    >
      <p className={styles.navigationTitle}>Рабочее место</p>
      <div className={styles.navigationLinks}>
      {navigationItems
        .filter((item) => !("managerOnly" in item) || isManagerAccount)
        .map((item) => {
        const isCurrent =
          pathname === item.href ||
          (item.href === "/staff/students" &&
            pathname.startsWith("/staff/students/")) ||
          (item.href === "/staff/achievements" &&
            pathname.startsWith("/staff/achievements")) ||
          (item.href === "/staff/events" &&
            pathname.startsWith("/staff/events/")) ||
          (item.href === "/staff/opportunities" &&
            pathname.startsWith("/staff/opportunities/")) ||
          (item.href === "/staff/certificate-forms" &&
            pathname.startsWith("/staff/certificate-forms/")) ||
          (item.href === "/staff" &&
            (pathname.startsWith("/staff/requests") ||
              pathname === "/staff"));
        return (
          <Link
            aria-label={item.label}
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
            <span className={styles.navigationLabel}>{item.label}</span>
          </Link>
        );
        })}
      </div>
      <button
        aria-controls="staff-navigation"
        aria-expanded={!isCollapsed}
        aria-label={toggleLabel}
        className={styles.navigationToggle}
        onClick={toggle}
        title={toggleLabel}
        type="button"
      >
        <ToggleIcon aria-hidden="true" strokeWidth={1.8} />
        <span className={styles.navigationLabel}>{toggleLabel}</span>
      </button>
    </nav>
  );
}

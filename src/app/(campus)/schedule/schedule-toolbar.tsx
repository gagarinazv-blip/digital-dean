"use client";

import Link from "next/link";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import styles from "./schedule-toolbar.module.css";

export function ScheduleToolbar({ children }: { children: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}

export function ScheduleSectionTabs({
  active,
  lessonsHref,
  sessionHref,
}: {
  active: "lessons" | "session";
  lessonsHref: string;
  sessionHref: string;
}) {
  function moveFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[role='tab']"),
    );
    const currentIndex = tabs.indexOf(
      document.activeElement as HTMLAnchorElement,
    );
    const direction = event.key === "ArrowRight" ? 1 : -1;
    tabs[(currentIndex + direction + tabs.length) % tabs.length]?.focus();
  }

  return (
    <nav
      aria-label="Раздел расписания"
      className={styles.sectionSwitch}
      onKeyDown={moveFocus}
      role="tablist"
    >
      <Link
        aria-current={active === "lessons" ? "page" : undefined}
        aria-selected={active === "lessons"}
        className={`${styles.sectionTab} ${
          active === "lessons" ? styles.sectionTabActive : ""
        }`}
        href={lessonsHref}
        role="tab"
        scroll={false}
      >
        Занятия
      </Link>
      <Link
        aria-current={active === "session" ? "page" : undefined}
        aria-selected={active === "session"}
        className={`${styles.sectionTab} ${
          active === "session" ? styles.sectionTabActive : ""
        }`}
        href={sessionHref}
        role="tab"
        scroll={false}
      >
        Сессия
      </Link>
    </nav>
  );
}

export function ScheduleFilterMenu({
  activeCount,
  children,
  detailsRef,
  panelClassName,
}: {
  activeCount: number;
  children: ReactNode;
  detailsRef: RefObject<HTMLDetailsElement | null>;
  panelClassName?: string;
}) {
  return (
    <details className={styles.filterMenu} ref={detailsRef}>
      <summary className={styles.filterButton}>
        Фильтры{activeCount > 0 ? ` · ${activeCount}` : ""}
      </summary>
      <div
        className={`${styles.filterPanel} ${panelClassName ?? ""}`}
        role="group"
        aria-label="Фильтры расписания"
      >
        {children}
      </div>
    </details>
  );
}

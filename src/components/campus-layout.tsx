import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/profile/actions";
import { CampusNavigation } from "@/components/campus-navigation";
import styles from "./campus-layout.module.css";

type CampusStudentMenu = {
  fullName: string;
};

export function CampusLayout({
  children,
  student,
  unreadNotificationCount,
}: {
  children: ReactNode;
  student: CampusStudentMenu;
  unreadNotificationCount: number;
}) {
  const initials = student.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("ru-RU");

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            aria-label="Открыть расписание"
            className={styles.mobileSchedule}
            href="/schedule"
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
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
          </Link>
          <Link
            aria-label="Кампус ОЭС — главная"
            className={styles.brand}
            href="/"
          >
            <span className={styles.brandMark} aria-hidden="true">
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
                viewBox="0 0 24 24"
              >
                <path d="m2 9 10-5 10 5-10 5z" />
                <path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" />
              </svg>
            </span>
            <span className={styles.brandText}>
              <strong>Кампус ОЭС</strong>
              <span>Цифровой деканат</span>
            </span>
          </Link>
          <span className={styles.headerDescriptor}>Студенческий кабинет</span>
          <div className={styles.headerSearch} aria-hidden="true">
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <span>Поиск по сервисам</span>
          </div>
          <div className={styles.headerActions}>
            <Link
              aria-label={
                unreadNotificationCount > 0
                  ? `Уведомления, непрочитанных: ${unreadNotificationCount}`
                  : "Уведомления"
              }
              className={styles.mobileNotifications}
              href="/notifications"
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
                <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              {unreadNotificationCount > 0 && (
                <span aria-hidden="true" className={styles.headerUnreadBadge}>
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </Link>
            <details className={styles.accountMenu}>
              <summary
                aria-label={`Меню аккаунта: ${student.fullName}`}
                className={styles.accountSummary}
              >
                <span aria-hidden="true" className={styles.avatar}>
                  {initials}
                </span>
                <span className={styles.accountName} title={student.fullName}>
                  {student.fullName}
                </span>
                <span aria-hidden="true" className={styles.chevron}>
                  ⌄
                </span>
              </summary>
              <div className={styles.accountPopover}>
                <Link className={styles.accountMenuLink} href="/profile">
                  Профиль
                </Link>
                <form action={logoutAction}>
                  <button className={styles.logout} type="submit">
                    Выйти
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
        <CampusNavigation unreadNotificationCount={unreadNotificationCount} />
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

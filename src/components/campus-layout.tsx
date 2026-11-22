import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/profile/actions";
import { CampusNavigation } from "@/components/campus-navigation";
import { NotificationBell } from "@/components/notification-bell";
import { SearchBox } from "@/components/search-box";
import { getAvatarInitials, getAvatarTone } from "@/lib/avatar";
import styles from "./campus-layout.module.css";

type CampusStudentMenu = {
  id: number;
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
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
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
          <div className={styles.headerActions}>
            <SearchBox />
            <NotificationBell
              initialUnreadCount={unreadNotificationCount}
              studentId={student.id}
            />
            <details className={styles.accountMenu}>
              <summary
                aria-label={`Меню аккаунта: ${student.fullName}`}
                className={styles.accountSummary}
              >
                <span
                  aria-hidden="true"
                  className={styles.avatar}
                  data-tone={getAvatarTone(student.fullName)}
                >
                  {getAvatarInitials(student.fullName)}
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
      </header>
      <div className={styles.shellBody}>
        <CampusNavigation
          unreadNotificationCount={unreadNotificationCount}
        />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

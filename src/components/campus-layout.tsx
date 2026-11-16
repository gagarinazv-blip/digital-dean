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
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="Campus Today — главная">
            <span className={styles.brandMark} aria-hidden="true">
              Д
            </span>
            <span className={styles.brandText}>
              <strong>Campus Today</strong>
              <span>Цифровой деканат</span>
            </span>
          </Link>
          <details className={styles.accountMenu}>
            <summary className={styles.accountSummary}>
              <span
                className={styles.accountName}
                title={student.fullName}
              >
                {student.fullName}
              </span>
              <span aria-hidden="true">⌄</span>
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
        <CampusNavigation unreadNotificationCount={unreadNotificationCount} />
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

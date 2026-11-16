import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/profile/actions";
import styles from "./staff-layout.module.css";

type StaffSummary = {
  fullName: string;
  position: string;
  department: string;
};

export function StaffLayout({
  children,
  staff,
}: {
  children: ReactNode;
  staff: StaffSummary;
}) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/staff">
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
              <span>Кабинет сотрудника</span>
            </span>
          </Link>
          <div className={styles.account}>
            <div className={styles.accountText}>
              <strong>{staff.fullName}</strong>
              <span>{staff.position} · {staff.department}</span>
            </div>
            <form action={logoutAction}>
              <button className={styles.logout} type="submit">
                Выйти
              </button>
            </form>
          </div>
        </div>
        <nav className={styles.navigation} aria-label="Разделы сотрудника">
          <Link
            aria-current="page"
            className={styles.navigationLink}
            href="/staff"
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
              <rect x="5" y="5" width="14" height="16" rx="2" />
              <path d="M9 5V3h6v2M8 12l2 2 5-5" />
            </svg>
            Заявки
          </Link>
        </nav>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

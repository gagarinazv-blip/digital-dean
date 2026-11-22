import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/profile/actions";
import { getAvatarInitials, getAvatarTone } from "@/lib/avatar";
import { StaffNavigation } from "@/components/staff-navigation";
import styles from "./staff-layout.module.css";

type StaffSummary = {
  fullName: string;
  position: string;
  department: string;
};

export function StaffLayout({
  children,
  isManagerAccount,
  isSidebarCollapsed,
  staff,
}: {
  children: ReactNode;
  isManagerAccount: boolean;
  isSidebarCollapsed: boolean;
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
              <span>Цифровой деканат</span>
            </span>
          </Link>
          <div className={styles.headerContext}>
            <strong>Кабинет сотрудника</strong>
            <span title={`${staff.position} · ${staff.department}`}>
              {staff.position} · {staff.department}
            </span>
          </div>
          <div className={styles.account}>
            <div className={styles.accountText}>
              <span
                aria-hidden="true"
                className={styles.avatar}
                data-tone={getAvatarTone(staff.fullName)}
              >
                {getAvatarInitials(staff.fullName)}
              </span>
              <strong title={staff.fullName}>{staff.fullName}</strong>
            </div>
            <form action={logoutAction}>
              <button className={styles.logout} type="submit">
                Выйти
              </button>
            </form>
          </div>
        </div>
      </header>
      <StaffNavigation
        initiallyCollapsed={isSidebarCollapsed}
        isManagerAccount={isManagerAccount}
      />
      <div className={styles.content}>{children}</div>
    </div>
  );
}

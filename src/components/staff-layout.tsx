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
              Д
            </span>
            <span className={styles.brandText}>
              <strong>Цифровой деканат</strong>
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
          <Link aria-current="page" className={styles.navigationLink} href="/staff">
            Заявки
          </Link>
        </nav>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

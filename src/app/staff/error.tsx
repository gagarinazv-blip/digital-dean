"use client";

import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function StaffError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.stack}>
      <section className={styles.panel} role="alert">
        <h1>Не удалось открыть заявки</h1>
        <p className={styles.hint}>
          Попробуйте загрузить страницу ещё раз.
        </p>
        <div className={styles.errorActions}>
          <button className={styles.button} onClick={reset} type="button">
            Повторить
          </button>
          <Link className={styles.secondaryButton} href="/staff">
            К очереди заявок
          </Link>
        </div>
      </section>
    </main>
  );
}

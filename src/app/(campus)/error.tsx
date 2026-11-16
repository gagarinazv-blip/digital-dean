"use client";

import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function CampusError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.stack}>
      <section className={styles.panel} role="alert">
        <h1>Не удалось загрузить раздел</h1>
        <p className={styles.hint}>
          Попробуйте ещё раз или вернитесь на главную страницу кабинета.
        </p>
        <div className={styles.errorActions}>
          <button className={styles.button} onClick={reset} type="button">
            Повторить
          </button>
          <Link className={styles.secondaryButton} href="/">
            На главную
          </Link>
        </div>
      </section>
    </main>
  );
}

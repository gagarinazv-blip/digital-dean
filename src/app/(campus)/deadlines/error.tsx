"use client";

import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function DeadlinesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.stack}>
      <section className={styles.panel} role="alert">
        <h1>Не удалось загрузить задания</h1>
        <p className={styles.hint}>Попробуйте ещё раз немного позже.</p>
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

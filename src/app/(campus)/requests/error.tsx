"use client";

import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function RequestsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.stack}>
      <section className={styles.panel} role="alert">
        <h1>Не удалось открыть раздел заявок</h1>
        <p className={styles.hint}>
          Попробуйте загрузить страницу ещё раз. Ваши данные не изменились.
        </p>
        <div className={styles.errorActions}>
          <button className={styles.button} onClick={reset} type="button">
            Повторить
          </button>
          <Link className={styles.secondaryButton} href="/help?tab=requests">
            Вернуться к моим заявкам
          </Link>
        </div>
      </section>
    </main>
  );
}

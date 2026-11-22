"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
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
        <EmptyState
          action={
            <div className={styles.errorActions}>
              <button className={styles.button} onClick={reset} type="button">
                Повторить
              </button>
              <Link className={styles.secondaryButton} href="/requests">
                Вернуться к моим заявкам
              </Link>
            </div>
          }
          description="Попробуйте загрузить страницу ещё раз. Ваши данные не изменились."
          headingLevel="h1"
          illustration="error"
          title="Не удалось открыть раздел заявок"
        />
      </section>
    </main>
  );
}

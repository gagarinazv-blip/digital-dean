"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import styles from "@/app/request-workflow.module.css";

export default function AppError({
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
              <Link className={styles.secondaryButton} href="/">
                На главную
              </Link>
            </div>
          }
          description="Попробуйте ещё раз или вернитесь на главную."
          headingLevel="h1"
          illustration="error"
          title="Не удалось загрузить страницу"
        />
      </section>
    </main>
  );
}

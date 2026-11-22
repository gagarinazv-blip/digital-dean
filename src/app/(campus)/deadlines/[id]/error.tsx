"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import styles from "@/app/request-workflow.module.css";

export default function DeadlineError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className={styles.stack}>
      <section className={styles.panel} role="alert">
        <EmptyState
          action={
            <div className={styles.errorActions}>
              <button
                className={styles.button}
                onClick={() => retry()}
                type="button"
              >
                Повторить
              </button>
              <Link className={styles.secondaryButton} href="/deadlines">
                Все дедлайны
              </Link>
            </div>
          }
          description="Попробуйте ещё раз немного позже."
          headingLevel="h1"
          illustration="error"
          title="Не удалось загрузить дедлайн"
        />
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
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
        <EmptyState
          action={
            <div className={styles.errorActions}>
              <button className={styles.button} onClick={reset} type="button">
                Повторить
              </button>
              <Link className={styles.secondaryButton} href="/staff">
                К очереди заявок
              </Link>
            </div>
          }
          description="Попробуйте загрузить страницу ещё раз."
          headingLevel="h1"
          illustration="error"
          title="Не удалось открыть заявки"
        />
      </section>
    </main>
  );
}

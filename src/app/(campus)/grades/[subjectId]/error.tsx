"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { CampusSection } from "@/components/campus-section";
import styles from "./subject.module.css";

export default function SubjectError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <CampusSection
      eyebrow="Успеваемость"
      title="Успеваемость"
      illustration="grades"
      tone="sage"
      description="Страница дисциплины временно недоступна."
    >
      <EmptyState
        action={
          <div className={styles.errorActions}>
            <button className={styles.retryButton} onClick={reset} type="button">
              Повторить
            </button>
            <Link className={styles.backLink} href="/grades">
              К учебному плану
            </Link>
          </div>
        }
        description="Попробуйте ещё раз или вернитесь к учебному плану."
        headingLevel="h2"
        illustration="error"
        role="alert"
        title="Не удалось загрузить дисциплину"
      />
    </CampusSection>
  );
}

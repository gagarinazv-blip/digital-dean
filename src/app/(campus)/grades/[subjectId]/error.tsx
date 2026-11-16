"use client";

import Link from "next/link";
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
      title="Не удалось загрузить дисциплину"
      description="Попробуйте ещё раз или вернитесь к учебному плану."
    >
      <div className={styles.errorActions}>
        <button className={styles.retryButton} onClick={reset} type="button">
          Повторить
        </button>
        <Link className={styles.backLink} href="/grades">
          К учебному плану
        </Link>
      </div>
    </CampusSection>
  );
}

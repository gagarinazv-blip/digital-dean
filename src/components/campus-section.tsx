import type { ReactNode } from "react";
import styles from "@/app/sections.module.css";

export function CampusSection({
  eyebrow,
  title,
  description,
  headerAction,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <div
        className={`${styles.heading} ${
          headerAction ? styles.headingWithAction : ""
        }`}
      >
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
        {headerAction ? (
          <div className={styles.headingAction}>{headerAction}</div>
        ) : null}
      </div>
      {children}
    </main>
  );
}

export function CampusLoading({ label }: { label: string }) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className={styles.loadingPage}
      role="status"
    >
      <p className={styles.loadingLabel}>Загружаем раздел «{label}»…</p>
      <div aria-hidden="true" className={styles.skeletonGrid}>
        <span className={styles.skeletonHeading} />
        <span className={styles.skeletonCard} />
        <span className={styles.skeletonCard} />
      </div>
    </main>
  );
}

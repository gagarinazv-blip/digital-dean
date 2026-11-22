import type { ReactNode } from "react";
import {
  SectionHeader,
  type SectionIllustration,
  type SectionTone,
} from "@/components/section-header";
import styles from "@/app/sections.module.css";

export function CampusSection({
  eyebrow,
  title,
  description,
  headerAction,
  illustration,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  headerAction?: ReactNode;
  illustration?: SectionIllustration;
  tone?: SectionTone;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <SectionHeader
          action={headerAction}
          description={description}
          eyebrow={eyebrow}
          illustration={illustration}
          title={title}
          tone={tone}
        />
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

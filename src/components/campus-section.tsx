import type { ReactNode } from "react";
import styles from "@/app/sections.module.css";

export function CampusSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      {children}
    </main>
  );
}

export function CampusLoading({ label }: { label: string }) {
  return (
    <main className={styles.page} aria-busy="true">
      <p className={styles.description}>Загружаем раздел «{label}»…</p>
    </main>
  );
}

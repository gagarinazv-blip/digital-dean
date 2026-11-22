import type { ReactNode } from "react";
import { SectionArt, type SectionIllustration } from "@/components/section-art";
import styles from "./section-header.module.css";

export type SectionTone = "blue" | "wine" | "sand" | "sage";

// Шапка раздела: заголовок, действие и иллюстрация на мягком градиенте.
export function SectionHeader({
  eyebrow,
  title,
  titleId,
  description,
  action,
  illustration,
  tone = "blue",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  action?: ReactNode;
  illustration?: SectionIllustration;
  tone?: SectionTone;
}) {
  return (
    <header className={styles.header} data-tone={tone}>
      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title} id={titleId}>
          {title}
        </h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
      {illustration ? (
        <SectionArt className={styles.illustration} name={illustration} />
      ) : null}
    </header>
  );
}

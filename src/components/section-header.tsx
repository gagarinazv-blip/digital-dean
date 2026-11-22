import type { ReactNode } from "react";
import styles from "./section-header.module.css";

export type SectionTone = "blue" | "wine" | "sand" | "sage";

export type SectionIllustration =
  | "schedule"
  | "digest"
  | "grades"
  | "documents"
  | "opportunities"
  | "notifications"
  | "profile"
  | "calm"
  | "requests"
  | "students"
  | "achievements"
  | "events"
  | "programs"
  | "certificates";

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
      <span aria-hidden="true" className={styles.rings} />
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
        // Декоративный SVG: оптимизация next/image для вектора не нужна.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className={styles.illustration}
          decoding="async"
          height={768}
          src={`/illustrations/${illustration}.svg`}
          width={1024}
        />
      ) : null}
    </header>
  );
}

import Link from "next/link";
import styles from "./deadline-list-item.module.css";

type DeadlineListItemProps = {
  href: string;
  title: string;
  subject: string;
  dateLabel: string;
  countdown: string;
  tone: "warning" | "danger" | "neutral";
};

export function DeadlineListItem({
  href,
  title,
  subject,
  dateLabel,
  countdown,
  tone,
}: DeadlineListItemProps) {
  return (
    <li className={styles.item}>
      <Link
        aria-label={`${title} — ${subject}, ${dateLabel}`}
        className={styles.link}
        href={href}
      >
        <span aria-hidden="true" className={styles.icon}>
          <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            viewBox="0 0 24 24"
          >
            <path d="M7 3.75h7l4 4V20a1.25 1.25 0 0 1-1.25 1.25h-9.5A1.25 1.25 0 0 1 6 20V5a1.25 1.25 0 0 1 1-1.25Z" />
            <path d="M14 4v4h4M9 13h6m-6 3.5h6" />
          </svg>
        </span>
        <span className={styles.details}>
          <strong className={styles.title} title={title}>
            {title}
          </strong>
          <span className={styles.meta} title={`${subject} · ${dateLabel}`}>
            {subject} · {dateLabel}
          </span>
        </span>
        <span className={`${styles.pill} ${styles[tone]}`}>{countdown}</span>
      </Link>
    </li>
  );
}

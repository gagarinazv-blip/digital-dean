import Link from "next/link";
import styles from "./deadline-list-item.module.css";

type DeadlineListItemProps = {
  href: string;
  title: string;
  subject: string;
  dateLabel: string;
  dateTileCaption: string;
  dateTileDay: string;
  countdown: string;
  tone: "warning" | "danger" | "neutral";
};

export function DeadlineListItem({
  href,
  title,
  subject,
  dateLabel,
  dateTileCaption,
  dateTileDay,
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
        <span aria-hidden="true" className={styles.dateTile}>
          <span>{dateTileCaption}</span>
          <strong>{dateTileDay}</strong>
        </span>
        <span className={styles.details}>
          <strong className={styles.title} title={title}>
            {title}
          </strong>
          <span className={styles.meta} title={subject}>
            {subject}
          </span>
        </span>
        <span className={`${styles.pill} ${styles[tone]}`}>{countdown}</span>
      </Link>
    </li>
  );
}

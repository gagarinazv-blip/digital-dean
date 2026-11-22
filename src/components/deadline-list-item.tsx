import Link from "next/link";
import { DateTimeStack } from "@/components/date-time-stack";
import styles from "./deadline-list-item.module.css";

export function DeadlineListItem({
  href,
  title,
  subject,
  dueAt,
}: {
  href: string;
  title: string;
  subject: string;
  dueAt: Date;
}) {
  return (
    <li className={styles.item}>
      <Link className={styles.link} href={href}>
        <span className={styles.details}>
          <strong className={styles.title} title={title}>
            {title}
          </strong>
          <span className={styles.meta} title={subject}>
            {subject}
          </span>
        </span>
        <DateTimeStack align="end" kind="deadline" value={dueAt} />
      </Link>
    </li>
  );
}

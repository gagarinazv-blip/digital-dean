import { DateTimeStack } from "@/components/date-time-stack";
import type { DeadlineRemaining as Remaining } from "@/lib/deadline-utils";
import styles from "./deadline-remaining.module.css";

// remaining === null — работа уже сдана, отсчёт не нужен.
export function DeadlineRemaining({
  dueAt,
  remaining,
}: {
  dueAt: Date | string;
  remaining: Remaining | null;
}) {
  return (
    <div
      className={styles.remaining}
      data-urgency={remaining?.urgency ?? "submitted"}
    >
      <span className={styles.urgency}>
        {remaining?.urgencyLabel ?? "Сдано"}
      </span>
      <DateTimeStack done={remaining === null} kind="deadline" value={dueAt} />
    </div>
  );
}

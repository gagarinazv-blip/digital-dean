import type { DeadlineRemaining as Remaining } from "@/lib/deadline-utils";
import styles from "./deadline-remaining.module.css";

// remaining === null — работа уже сдана, отсчёт не нужен.
export function DeadlineRemaining({
  dueIso,
  dueLabel,
  remaining,
}: {
  dueIso: string;
  dueLabel: string;
  remaining: Remaining | null;
}) {
  return (
    <div
      className={styles.remaining}
      data-urgency={remaining?.urgency ?? "submitted"}
    >
      {remaining && (
        <span className={styles.urgency}>{remaining.urgencyLabel}</span>
      )}
      <strong className={styles.label}>{remaining?.label ?? "Сдано"}</strong>
      <time className={styles.due} dateTime={dueIso}>
        {dueLabel}
      </time>
    </div>
  );
}

import { DateTimeStack } from "@/components/date-time-stack";
import type { DeadlineFormat } from "@/generated/prisma/enums";
import {
  getDeadlineAction,
  getDeadlineCalendarHref,
} from "@/lib/deadline-action";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "./deadline-hand-in.module.css";

export function DeadlineHandIn({
  deadlineId,
  dueAt,
  format,
  location,
  showCalendar = false,
  taskUrl,
}: {
  deadlineId: string;
  dueAt: Date | string;
  format: DeadlineFormat;
  location: string | null;
  showCalendar?: boolean;
  taskUrl: string | null;
}) {
  const action = getDeadlineAction(format, taskUrl);

  if (action.kind === "none") {
    return (
      <p className={styles.hint}>Ссылка на задание пока не добавлена.</p>
    );
  }
  if (action.kind === "open-task") {
    return (
      <a
        className={workflowStyles.button}
        href={action.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        Открыть задание
        <span className={styles.visuallyHidden}> (в новой вкладке)</span>
      </a>
    );
  }
  return (
    <div className={styles.stack}>
      <dl className={styles.place}>
        <div>
          <dt>{format === "EXAM" ? "Аудитория" : "Место"}</dt>
          <dd>{location ?? "Уточняется"}</dd>
        </div>
        <div>
          <dt>Время</dt>
          <dd>
            <DateTimeStack kind="deadline" value={dueAt} />
          </dd>
        </div>
      </dl>
      {showCalendar && (
        <a
          className={workflowStyles.button}
          download
          href={getDeadlineCalendarHref(deadlineId)}
        >
          Добавить в календарь
        </a>
      )}
    </div>
  );
}

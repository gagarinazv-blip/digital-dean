import { DateTimeStack } from "@/components/date-time-stack";
import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { EmptyState } from "@/components/empty-state";
import controls from "@/components/ui/controls.module.css";
import { getDeadlineRemaining } from "@/lib/deadline-utils";
import { getStudentDeadlines } from "@/lib/deadline-data";
import { getDeadlineHref } from "@/lib/deadline-action";
import { getDemoNow } from "@/lib/demo-date";
import { requireStudent } from "@/lib/student";
import styles from "./deadlines.module.css";

export const instant = false;

export default async function DeadlinesPage() {
  const student = await requireStudent();
  const now = getDemoNow();
  const deadlines = await getStudentDeadlines(student.id);

  return (
    <CampusSection
      eyebrow="Учебные задания"
      title="Задания и сроки"
      description="Ваши текущие задания и даты сдачи."
    >
      {deadlines.length === 0 ? (
        <EmptyState
          className={styles.empty}
          description="Здесь появятся задания и сроки по вашим дисциплинам."
          illustration="documents"
          title="Заданий пока нет"
        />
      ) : (
        <ul className={styles.list}>
          {deadlines.map((deadline) => {
            const urgency =
              deadline.status === "OPEN"
                ? getDeadlineRemaining(deadline.dueAt, now).urgency
                : null;
            const badge =
              deadline.status === "SUBMITTED"
                ? { label: "Сдано", tone: "success" }
                : urgency === "overdue"
                  ? { label: "Просрочено", tone: "danger" }
                  : urgency === "urgent"
                    ? { label: "Срочно", tone: "warning" }
                    : null;
            return (
              <li
                className={`${styles.item} ${
                  urgency === "overdue" ? styles.overdue : ""
                }`}
                id={`deadline-${deadline.id}`}
                key={deadline.id}
              >
                <div className={styles.heading}>
                  <p>{deadline.subject}</p>
                  {badge ? (
                    <span className={controls.badge} data-tone={badge.tone}>
                      {badge.label}
                    </span>
                  ) : null}
                </div>
                <h2>
                  <Link
                    className={styles.titleLink}
                    href={getDeadlineHref(deadline.id)}
                  >
                    {deadline.title}
                  </Link>
                </h2>
                {deadline.description && <p>{deadline.description}</p>}
                <DateTimeStack
                  done={deadline.status === "SUBMITTED"}
                  kind="deadline"
                  value={deadline.dueAt}
                />
              </li>
            );
          })}
        </ul>
      )}
    </CampusSection>
  );
}

import { CampusSection } from "@/components/campus-section";
import { getDeadlineCountdown } from "@/lib/deadline-utils";
import { getStudentDeadlines } from "@/lib/deadline-data";
import { getDemoNow } from "@/lib/demo-date";
import { requireStudent } from "@/lib/student";
import styles from "./deadlines.module.css";

export const instant = false;

const deadlineDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeZone: "Europe/Moscow",
});

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
        <div className={styles.empty}>
          <strong>Заданий пока нет</strong>
          <p>Здесь появятся задания и сроки по вашим дисциплинам.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {deadlines.map((deadline) => {
            const countdown =
              deadline.status === "OPEN"
                ? getDeadlineCountdown(deadline.dueAt, now)
                : null;
            return (
              <li
                className={`${styles.item} ${
                  countdown?.kind === "OVERDUE" ? styles.overdue : ""
                }`}
                id={`deadline-${deadline.id}`}
                key={deadline.id}
              >
                <div className={styles.heading}>
                  <p>{deadline.subject}</p>
                  <span
                    className={`${styles.status} ${
                      deadline.status === "SUBMITTED"
                        ? styles.submitted
                        : countdown?.kind === "OVERDUE"
                          ? styles.statusOverdue
                          : ""
                    }`}
                  >
                    {deadline.status === "SUBMITTED"
                      ? "Сдано"
                      : countdown?.label}
                  </span>
                </div>
                <h2>{deadline.title}</h2>
                {deadline.description && <p>{deadline.description}</p>}
                <time dateTime={deadline.dueAt.toISOString()}>
                  Срок: {deadlineDateFormatter.format(deadline.dueAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </CampusSection>
  );
}

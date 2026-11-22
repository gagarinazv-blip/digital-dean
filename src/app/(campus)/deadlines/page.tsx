import { Suspense } from "react";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { EmptyState } from "@/components/empty-state";
import {
  getDeadlineCountdown,
  getDeadlineCountdownTone,
} from "@/lib/deadline-utils";
import { getUniversityDateTimeFormatter } from "@/lib/campus-time";
import { getStudentDeadlines } from "@/lib/deadline-data";
import { getDemoNow } from "@/lib/demo-date";
import { requireStudent } from "@/lib/student";
import styles from "./deadlines.module.css";

const deadlineDateFormatter = getUniversityDateTimeFormatter({
  dateStyle: "long",
});

export default function DeadlinesPage() {
  return (
    <Suspense fallback={<CampusLoading label="задания и сроки" />}>
      <DeadlinesContent />
    </Suspense>
  );
}

async function DeadlinesContent() {
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
            const countdown =
              deadline.status === "OPEN"
                ? getDeadlineCountdown(deadline.dueAt, now)
                : null;
            const tone =
              deadline.status === "SUBMITTED"
                ? styles.submitted
                : countdown
                  ? styles[getDeadlineCountdownTone(countdown)]
                  : "";
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
                    className={`${styles.status} ${tone}`}
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

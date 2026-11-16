import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { AcademicResultStatus } from "@/generated/prisma/enums";
import { controlTypeLabels } from "@/lib/campus-labels";
import { formatCampusDate, formatCampusTime } from "@/lib/campus-time";
import { getAcademicRecords } from "@/lib/academic-records";
import styles from "./subject.module.css";

type SubjectPageProps = {
  params: Promise<{ subjectId: string }>;
};

const resultStatusLabels: Record<AcademicResultStatus, string> = {
  PASSED: "Сдано",
  ACADEMIC_DEBT: "Академическая задолженность",
};

export default async function SubjectPage({ params }: SubjectPageProps) {
  await connection();
  const { subjectId } = await params;
  const { dataset } = await getAcademicRecords();
  const semester = dataset?.semesters.find((item) =>
    item.planItems.some((planItem) => planItem.id === subjectId),
  );
  const subject = semester?.planItems.find(
    (planItem) => planItem.id === subjectId,
  );

  if (!dataset || !semester || !subject) notFound();

  const session = subject.sessions[0];
  const assessmentName =
    subject.controlType === "EXAM"
      ? "Экзамен"
      : controlTypeLabels[subject.controlType];

  return (
    <main className={styles.page}>
      <section className={styles.subjectHero}>
        <h1>{subject.name}</h1>
        <p>Кабинет студента · {dataset.academicYear}</p>
        <Link className={styles.allSubjectsLink} href="/grades">
          <span aria-hidden="true">‹</span> Все дисциплины
        </Link>
      </section>

      <div className={styles.detailGrid}>
        <section
          aria-labelledby="subject-information-title"
          className={styles.detailCard}
        >
          <div className={styles.cardHeading}>
            <span className={styles.infoIcon} aria-hidden="true">
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5m0-8h.01" />
              </svg>
            </span>
            <h2 id="subject-information-title">Сведения о дисциплине</h2>
          </div>
          <dl className={styles.details}>
            <div>
              <dt>Преподаватель</dt>
              <dd>{subject.teacher}</dd>
            </div>
            <div>
              <dt>Учебный период</dt>
              <dd>{semester.name} семестр</dd>
            </div>
            <div>
              <dt>Трудоёмкость</dt>
              <dd>{subject.credits} зачётные единицы</dd>
            </div>
            <div>
              <dt>{assessmentName}</dt>
              <dd>
                {session
                  ? `${formatCampusDate(session.date)}, ${formatCampusTime(session.startTime)}`
                  : "Дата не опубликована"}
              </dd>
            </div>
            <div>
              <dt>Место</dt>
              <dd>
                {session ? `Аудитория ${session.room}` : "Не назначено"}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="subject-results-title"
          className={styles.detailCard}
        >
          <div className={styles.cardHeading}>
            <span className={styles.resultsIcon} aria-hidden="true">
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M4 20V12M10 20V7M16 20V4M22 20V9" />
              </svg>
            </span>
            <h2 id="subject-results-title">Текущие результаты</h2>
          </div>

          {subject.result ? (
            <div className={styles.resultContent}>
              <div className={styles.resultHeading}>
                <strong
                  className={
                    subject.result.status === "ACADEMIC_DEBT"
                      ? styles.resultDebt
                      : styles.resultValue
                  }
                >
                  {subject.result.value}
                </strong>
                <span
                  className={styles.resultStatus}
                  data-status={subject.result.status}
                >
                  {resultStatusLabels[subject.result.status]}
                </span>
              </div>
              <ul className={styles.attempts}>
                {subject.result.attempts.map((attempt) => (
                  <li key={attempt.id}>
                    <span>
                      Попытка {attempt.attemptNumber} ·{" "}
                      {formatCampusDate(attempt.date)}
                    </span>
                    <strong>{attempt.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.noResult}>Оценка ещё не выставлена.</p>
          )}

          <Link className={styles.calculateButton} href="/grades?tab=calculator">
            Рассчитать итоговую оценку
          </Link>
        </section>
      </div>
    </main>
  );
}

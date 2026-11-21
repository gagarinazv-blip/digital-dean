import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { AcademicResultStatus } from "@/generated/prisma/enums";
import { controlTypeLabels } from "@/lib/campus-labels";
import { formatCampusDate, formatCampusTime } from "@/lib/campus-time";
import { getAcademicRecords } from "@/lib/academic-records";
import {
  calculateGrade,
  computerNetworksFormula,
} from "@/lib/grade-formula";
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
  const formula =
    subjectId === computerNetworksFormula.subjectId
      ? computerNetworksFormula
      : null;
  const formulaCalculation = formula
    ? calculateGrade(formula)
    : null;

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

      {formula && formulaCalculation ? (
        <section
          aria-labelledby="formula-title"
          className={styles.formulaCard}
        >
          <div className={styles.cardHeading}>
            <h2 id="formula-title">Формула итоговой оценки</h2>
            <span className={styles.formulaStatus}>Формула опубликована</span>
          </div>
          <p className={styles.formulaSource}>{formula.sourceNote}</p>
          <div className={styles.formulaGrid}>
            <div className={styles.componentTableWrap}>
              <table className={styles.componentTable}>
                <thead>
                  <tr>
                    <th scope="col">Компонент</th>
                    <th scope="col">Статус</th>
                    <th scope="col">Баллы</th>
                    <th scope="col">Вес</th>
                    <th scope="col">Вклад сейчас</th>
                  </tr>
                </thead>
                <tbody>
                  {formula.components.map((component) => {
                    const received =
                      component.status === "RECEIVED" &&
                      component.baselineScore !== undefined;
                    const contribution = received
                      ? (component.baselineScore! / component.maxPoints) *
                        component.weight
                      : null;
                    return (
                      <tr key={component.id}>
                        <th scope="row">{component.name}</th>
                        <td data-label="Статус">
                          {received ? "Оценено" : "Не оценено"}
                        </td>
                        <td data-label="Баллы">
                          {received
                            ? `${component.baselineScore} / ${component.maxPoints}`
                            : `— / ${component.maxPoints}`}
                        </td>
                        <td data-label="Вес">{component.weight}%</td>
                        <td data-label="Вклад сейчас">
                          {contribution === null
                            ? "0 баллов до оценки"
                            : `${contribution.toFixed(1)} / ${component.weight}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <aside className={styles.forecastCard}>
              <p>Накопленный вклад</p>
              <strong>{formulaCalculation.totalPoints} / 100</strong>
              <div
                aria-label={`Накопленный вклад ${formulaCalculation.totalPoints} из 100`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={formulaCalculation.totalPoints}
                className={styles.forecastTrack}
                role="progressbar"
              >
                <span
                  style={{ width: `${formulaCalculation.totalPoints}%` }}
                />
              </div>
              <p className={styles.remainingWeight}>
                Ещё не оценено:{" "}
                {formula.components
                  .filter((component) => component.status === "NOT_RECEIVED")
                  .reduce((total, component) => total + component.weight, 0)}
                % веса
              </p>
              <Link
                className={styles.calculateButton}
                href="/grades?tab=calculator"
              >
                Открыть прогноз
              </Link>
            </aside>
          </div>
        </section>
      ) : (
        <section
          aria-labelledby="formula-unavailable-title"
          className={styles.formulaUnavailable}
        >
          <h2 id="formula-unavailable-title">
            Весовая формула не опубликована
          </h2>
          <p>
            Для этой дисциплины проект хранит итог и попытки, но не содержит
            баллы работ или правила агрегации категорий. Точный прогноз или
            вычисление работ по весу не применяются.
          </p>
        </section>
      )}

      <section
        aria-labelledby="assessment-events-title"
        className={styles.eventsCard}
      >
        <div className={styles.cardHeading}>
          <h2 id="assessment-events-title">Оценочные мероприятия</h2>
          <span>{subject.sessions.length} в расписании</span>
        </div>
        {subject.sessions.length > 0 ? (
          <ul className={styles.eventList}>
            {subject.sessions.map((session) => (
              <li key={session.id}>
                <div>
                  <strong>{assessmentName}</strong>
                  <span>
                    {formatCampusDate(session.date)},{" "}
                    {formatCampusTime(session.startTime)}
                  </span>
                </div>
                <span
                  className={
                    session.status === "COMPLETED"
                      ? styles.completedEvent
                      : styles.plannedEvent
                  }
                >
                  {session.status === "COMPLETED" ? "Проведено" : "Запланировано"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noResult}>
            В существующих данных нет мероприятий с датой и форматом.
          </p>
        )}
      </section>
    </main>
  );
}

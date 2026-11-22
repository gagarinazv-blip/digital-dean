import { DateTimeStack } from "@/components/date-time-stack";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { AcademicResultStatus } from "@/generated/prisma/enums";
import { controlTypeLabels } from "@/lib/campus-labels";
import { getMoscowDateTime } from "@/lib/campus-time";
import { getAcademicRecords } from "@/lib/academic-records";
import { analyzeGrade } from "@/lib/grade-analysis";
import { getGradebookEntry } from "@/lib/gradebook-data";
import styles from "./subject.module.css";

type SubjectPageProps = {
  params: Promise<{ subjectId: string }>;
};

const resultStatusLabels: Record<AcademicResultStatus, string> = {
  PASSED: "Сдано",
  ACADEMIC_DEBT: "Академическая задолженность",
};

function formatGradePoints(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  await connection();
  const { subjectId } = await params;
  const { dataset, login } = await getAcademicRecords();
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
  const gradebookEntry = getGradebookEntry(login, semester.code, subjectId);
  const gradeAnalysis = gradebookEntry
    ? analyzeGrade(
        gradebookEntry.formula,
        gradebookEntry.scores,
        {},
        subject.result?.value ?? null,
        gradebookEntry.components,
      )
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
                {session ? (
                  <DateTimeStack
                    end={getMoscowDateTime(session.date, session.endTime)}
                    value={getMoscowDateTime(session.date, session.startTime)}
                  />
                ) : (
                  "Дата не опубликована"
                )}
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
                    <span>Попытка {attempt.attemptNumber}</span>
                    <DateTimeStack allDay value={attempt.date} />
                    <strong>{attempt.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.noResult}>Оценка ещё не выставлена.</p>
          )}

          {gradebookEntry && (
            <Link
              className={styles.calculateButton}
              href={`/grades?tab=calculator&subject=${encodeURIComponent(subjectId)}`}
            >
              Открыть калькулятор прогноза
            </Link>
          )}
        </section>
      </div>

      {gradebookEntry && gradeAnalysis ? (
        <section
          aria-labelledby="formula-title"
          className={styles.formulaCard}
        >
          <div className={styles.cardHeading}>
            <h2 id="formula-title">Формула итоговой оценки</h2>
            <span
              className={styles.formulaStatus}
              data-source={gradebookEntry.formula.source}
            >
              {gradebookEntry.formula.source === "DEMONSTRATION"
                ? "Демонстрационная формула"
                : "Формула опубликована"}
            </span>
          </div>
          <p className={styles.formulaSource}>
            {gradebookEntry.formula.sourceNote}
          </p>
          <p className={styles.formulaExplanation}>
            Итог = сумма (балл за компонент ÷ максимум × вес компонента).
            Полученные компоненты формируют текущий вклад; неоценённые не
            считаются нулями. Полный расчёт округляется до целого по правилу
            half-up. Шкала:{" "}
            {gradebookEntry.formula.scale
              .map(
                (band) =>
                  `${band.minimumPoints}–${band.maximumPoints}: ${band.grade}`,
              )
              .join(" · ")}.
          </p>
          <div className={styles.formulaGrid}>
            <div className={styles.componentTableWrap}>
              <table className={styles.componentTable}>
                <thead>
                  <tr>
                    <th scope="col">Компонент</th>
                    <th scope="col">Статус</th>
                    <th scope="col">Дата</th>
                    <th scope="col">Баллы</th>
                    <th scope="col">Вес</th>
                    <th scope="col">Вклад сейчас</th>
                    <th scope="col">Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeAnalysis.components.map((component) => {
                    return (
                      <tr key={component.code}>
                        <th scope="row">{component.name}</th>
                        <td data-label="Статус">
                          {component.status === "RECEIVED"
                            ? "Оценено"
                            : "Не получено"}
                        </td>
                        <td data-label="Дата">
                          {component.date ? (
                            <DateTimeStack allDay value={component.date} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-label="Баллы">
                          {component.status === "RECEIVED"
                            ? `${formatGradePoints(component.score ?? 0)} / ${component.maxPoints}`
                            : `— / ${component.maxPoints}`}
                        </td>
                        <td data-label="Вес">{component.weight}%</td>
                        <td data-label="Вклад сейчас">
                          {component.currentContribution === null
                            ? "Не включён"
                            : `${formatGradePoints(component.currentContribution)} / ${component.weight}`}
                        </td>
                        <td data-label="Комментарий">
                          {component.comment ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={styles.componentTableTotal}>
                    <th scope="row" colSpan={4}>
                      Накоплено
                    </th>
                    <td>{gradeAnalysis.remainingWeight}% ещё не оценено</td>
                    <td>
                      {formatGradePoints(gradeAnalysis.accumulatedContribution)} / 100
                    </td>
                    <td>Без гипотез</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <aside className={styles.forecastCard}>
              <p>Текущий накопленный вклад</p>
              <strong>
                {formatGradePoints(gradeAnalysis.accumulatedContribution)} / 100
              </strong>
              <div
                aria-label={`Накопленный вклад ${gradeAnalysis.accumulatedContribution} из 100`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={gradeAnalysis.accumulatedContribution}
                className={styles.forecastTrack}
                role="progressbar"
              >
                <span
                  style={{
                    width: `${gradeAnalysis.accumulatedContribution}%`,
                  }}
                />
              </div>
              <p className={styles.remainingWeight}>
                Остаётся набрать до {gradeAnalysis.remainingMaximumPoints} баллов
                по {gradeAnalysis.remainingWeight}% веса.
              </p>
              <div className={styles.ungradedBlock}>
                <h3>Не получено</h3>
                {gradeAnalysis.remainingComponents.length ? (
                  <ul>
                    {gradeAnalysis.remainingComponents.map((component) => (
                      <li key={component.code}>
                        <span>{component.name}</span>
                        <strong>
                          До {component.maxPoints} баллов · вес{" "}
                          {component.weight}%
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Все компоненты оценены; расчёт не заменяет официальный итог.
                  </p>
                )}
              </div>
              <div className={styles.minimumScores}>
                <h3>Минимальный балл по каждому оставшемуся компоненту</h3>
                <p>
                  Для расчёта предполагается, что другие неоценённые компоненты
                  дадут 0 баллов.
                </p>
                {gradeAnalysis.minimumScores.length > 0 && (
                  <ul>
                    {gradeAnalysis.minimumScores.map((item) => {
                      const component = gradeAnalysis.remainingComponents.find(
                        (candidate) =>
                          candidate.code === item.componentCode,
                      );
                      return (
                        <li key={`${item.componentCode}-${item.grade}`}>
                          <span>
                            {component?.name ?? item.componentCode} · оценка{" "}
                            {item.grade}
                          </span>
                          <strong>
                            {item.score === null
                              ? "Недостижимо"
                              : `${formatGradePoints(item.score)} баллов`}
                          </strong>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className={styles.forecastSummary}>
                <h3>Прогноз</h3>
                <p>Это прогноз, а не официальная оценка.</p>
                {gradeAnalysis.forecastComplete ? (
                  <p>
                    По оценённым компонентам:{" "}
                    {gradeAnalysis.forecastCalculation.totalPoints} / 100
                    {gradeAnalysis.forecastCalculation.grade !== null
                      ? ` · оценка ${gradeAnalysis.forecastCalculation.grade}`
                      : ""}
                  </p>
                ) : (
                  <p>
                    Добавьте гипотезы в калькулятор, чтобы оценить будущий
                    результат.
                  </p>
                )}
              </div>
              <div className={styles.officialSummary}>
                <h3>Официальный итог</h3>
                <p>
                  {gradeAnalysis.officialResult ??
                    "Не выставлен; расчёт по формуле его не заменяет."}
                </p>
              </div>
              <Link
                className={styles.calculateButton}
                href={`/grades?tab=calculator&subject=${encodeURIComponent(subjectId)}`}
              >
                Рассчитать прогноз
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
            Формула оценивания не опубликована
          </h2>
          <p>
            Показываем только официальные результаты и попытки из зачётной
            книжки. Веса и прогноз не рассчитываются без опубликованной формулы.
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
                  <DateTimeStack
                    end={getMoscowDateTime(session.date, session.endTime)}
                    value={getMoscowDateTime(session.date, session.startTime)}
                  />
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

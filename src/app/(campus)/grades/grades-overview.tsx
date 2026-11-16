"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./grades.module.css";

export type GradeSubjectSummary = {
  id: string;
  name: string;
  controlLabel: string;
  credits: number;
  resultValue: string | null;
  resultStatus: "PASSED" | "ACADEMIC_DEBT" | null;
};

export type GradeSemesterSummary = {
  id: string;
  name: string;
  number: number;
  isCurrent: boolean;
  average: number | null;
  completedCredits: number;
  totalCredits: number;
  debtCount: number;
  subjects: GradeSubjectSummary[];
};

type GradesOverviewProps = {
  academicYear: string;
  semesters: GradeSemesterSummary[];
};

type PeriodView = "current" | "all" | "dynamics";

function formatAverage(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
}

function getStatus(subject: GradeSubjectSummary) {
  if (subject.resultStatus === "PASSED") {
    return { label: "Зачтено", className: styles.passed };
  }
  if (subject.resultStatus === "ACADEMIC_DEBT") {
    return { label: "Долг", className: styles.debtStatus };
  }
  return { label: "Запланировано", className: styles.pending };
}

function SubjectTable({
  subjects,
  periodName,
}: {
  subjects: GradeSubjectSummary[];
  periodName?: string;
}) {
  return (
    <div className={styles.subjectTableWrap}>
      <table className={styles.subjectTable}>
        <thead>
          <tr>
            <th scope="col">Дисциплина</th>
            <th scope="col">Оценка</th>
            <th scope="col">Кредиты</th>
            <th scope="col">Статус</th>
            <th scope="col">
              <span className={styles.visuallyHidden}>Открыть дисциплину</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => {
            const status = getStatus(subject);
            return (
              <tr key={subject.id}>
                <td data-label="Дисциплина">
                  <Link
                    className={styles.subjectLink}
                    href={`/grades/${encodeURIComponent(subject.id)}`}
                  >
                    <span className={styles.subjectStackIcon} aria-hidden="true">
                      <svg
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.7"
                        viewBox="0 0 24 24"
                      >
                        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
                        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
                      </svg>
                    </span>
                    <span className={styles.subjectText}>
                      {periodName && (
                        <small className={styles.periodLabel}>
                          {periodName} семестр
                        </small>
                      )}
                      <strong>{subject.name}</strong>
                      <small>{subject.controlLabel}</small>
                    </span>
                  </Link>
                </td>
                <td data-label="Оценка">
                  <strong className={styles.gradeValue}>
                    {subject.resultValue ?? "—"}
                  </strong>
                </td>
                <td data-label="Кредиты">{subject.credits}</td>
                <td data-label="Статус">
                  <span className={`${styles.statusBadge} ${status.className}`}>
                    {subject.resultStatus === "PASSED" && (
                      <span aria-hidden="true">✓</span>
                    )}
                    {status.label}
                  </span>
                </td>
                <td className={styles.openCell}>
                  <Link
                    aria-label={`Открыть дисциплину «${subject.name}»`}
                    className={styles.openSubject}
                    href={`/grades/${encodeURIComponent(subject.id)}`}
                  >
                    <span aria-hidden="true">›</span>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function GradesOverview({
  academicYear,
  semesters,
}: GradesOverviewProps) {
  const defaultSemester =
    semesters.find((semester) => semester.isCurrent) ?? semesters[0];
  const [period, setPeriod] = useState<PeriodView>("current");
  const [selectedSemesterId, setSelectedSemesterId] = useState(
    defaultSemester?.id ?? "",
  );
  const currentSemester = defaultSemester;
  const selectedSemester =
    semesters.find((semester) => semester.id === selectedSemesterId) ??
    currentSemester;
  const completionPercent =
    currentSemester && currentSemester.totalCredits > 0
      ? Math.round(
          (currentSemester.completedCredits / currentSemester.totalCredits) *
            100,
        )
      : 0;

  if (!currentSemester) {
    return (
      <div className={styles.empty}>
        <strong>Данные не найдены</strong>
        <p>Для этой учётной записи пока нет учебного плана.</p>
      </div>
    );
  }

  return (
    <div className={styles.overview}>
      <div className={styles.overviewHero}>
        <section className={styles.averageCard}>
          <span className={styles.currentSemesterBadge}>
            Текущий семестр
          </span>
          <strong className={styles.averageValue}>
            {formatAverage(currentSemester.average)} / 5
          </strong>
          <span className={styles.averageCaption}>Средний балл</span>
          <span className={styles.creditsCaption}>
            <svg
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
            >
              <path d="m2 9 10-5 10 5-10 5z" />
              <path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" />
            </svg>
            {currentSemester.completedCredits} зачётных единиц
          </span>
        </section>

        <div className={styles.overviewSummary}>
          <section className={styles.summaryCard}>
            <h2>Академический прогресс</h2>
            <div className={styles.progressLabel}>
              <span>
                Выполнено: {currentSemester.completedCredits} из{" "}
                {currentSemester.totalCredits} кредитов
              </span>
              <strong>{completionPercent} %</strong>
            </div>
            <div
              aria-label={`Академический прогресс: ${completionPercent}%`}
              className={styles.progressTrack}
              role="img"
            >
              <span style={{ width: `${completionPercent}%` }} />
            </div>
          </section>

          <section className={styles.summaryCard}>
            <h2>Статус обучения</h2>
            <span
              className={`${styles.studyStatus} ${
                currentSemester.debtCount > 0
                  ? styles.studyStatusDebt
                  : styles.studyStatusGood
              }`}
            >
              {currentSemester.debtCount > 0
                ? `Академическая задолженность: ${currentSemester.debtCount}`
                : "Без академических задолженностей"}
            </span>
          </section>
        </div>
      </div>

      <div className={styles.periodControls}>
        <div
          aria-label="Период успеваемости"
          className={styles.periodTabs}
          role="tablist"
        >
          <button
            aria-controls="grades-period-panel"
            aria-selected={period === "current"}
            className={styles.periodTab}
            id="grades-period-current-tab"
            onClick={() => setPeriod("current")}
            role="tab"
            type="button"
          >
            Текущий семестр
          </button>
          <button
            aria-controls="grades-period-panel"
            aria-selected={period === "all"}
            className={styles.periodTab}
            id="grades-period-all-tab"
            onClick={() => setPeriod("all")}
            role="tab"
            type="button"
          >
            Все семестры
          </button>
          <button
            aria-controls="grades-period-panel"
            aria-selected={period === "dynamics"}
            className={styles.periodTab}
            id="grades-period-dynamics-tab"
            onClick={() => setPeriod("dynamics")}
            role="tab"
            type="button"
          >
            Динамика
          </button>
        </div>

        {period === "current" && (
          <label className={styles.semesterSelect}>
            <span className={styles.visuallyHidden}>Выбрать семестр</span>
            <select
              onChange={(event) => setSelectedSemesterId(event.target.value)}
              value={selectedSemester?.id ?? ""}
            >
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name} семестр {academicYear}
                  {semester.isCurrent ? " · текущий" : ""}
                </option>
              ))}
            </select>
            <span aria-hidden="true">⌄</span>
          </label>
        )}
      </div>

      <div
        aria-labelledby={`grades-period-${period}-tab`}
        className={styles.contentPanel}
        id="grades-period-panel"
        role="tabpanel"
        tabIndex={0}
      >
        {period === "current" && selectedSemester && (
          <>
            <div className={styles.tableTitle}>
              <h2>
                {selectedSemester.name} семестр · {selectedSemester.number}-й
                семестр
              </h2>
              <span>{selectedSemester.subjects.length} дисциплин</span>
            </div>
            <SubjectTable subjects={selectedSemester.subjects} />
          </>
        )}

        {period === "all" && (
          <div className={styles.semesterTables}>
            {semesters.map((semester) => (
              <section className={styles.semesterBlock} key={semester.id}>
                <div className={styles.tableTitle}>
                  <h2>
                    {semester.name} семестр · {semester.number}-й семестр
                  </h2>
                  {semester.isCurrent && (
                    <span className={styles.currentLabel}>Текущий</span>
                  )}
                </div>
                <SubjectTable
                  periodName={semester.name}
                  subjects={semester.subjects}
                />
              </section>
            ))}
          </div>
        )}

        {period === "dynamics" && (
          <section aria-labelledby="dynamics-title" className={styles.dynamics}>
            <div className={styles.tableTitle}>
              <h2 id="dynamics-title">Средний балл по семестрам</h2>
              <span>По числовым оценкам, шкала до 5</span>
            </div>
            <div className={styles.dynamicsList}>
              {semesters.map((semester) => (
                <div className={styles.dynamicsItem} key={semester.id}>
                  <div className={styles.dynamicsHeading}>
                    <strong>
                      {semester.name} · {semester.number}-й семестр
                    </strong>
                    <span>{formatAverage(semester.average)} / 5</span>
                  </div>
                  <div className={styles.dynamicsTrack}>
                    <span
                      style={{
                        width: `${((semester.average ?? 0) / 5) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { useState, type KeyboardEvent } from "react";
import type { GradeFormulaSource } from "@/lib/grade-formula";
import styles from "./grades.module.css";

export type GradeSubjectSummary = {
  id: string;
  name: string;
  controlLabel: string;
  credits: number;
  resultValue: string | null;
  resultStatus: "PASSED" | "ACADEMIC_DEBT" | null;
  formulaSource: GradeFormulaSource | null;
  currentContribution: number | null;
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

function formatContribution(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatus(subject: GradeSubjectSummary) {
  if (subject.resultStatus === "PASSED") {
    return { label: "Зачтено", className: styles.passed };
  }
  if (subject.resultStatus === "ACADEMIC_DEBT") {
    return { label: "Долг", className: styles.debtStatus };
  }
  return { label: "В процессе", className: styles.pending };
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
            <th scope="col">Официальный итог / накоплено</th>
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
                      <small>
                        {subject.formulaSource === "DEMONSTRATION"
                          ? "Демонстрационная формула"
                          : subject.formulaSource === "PUBLISHED"
                            ? "Формула опубликована"
                            : "Формула оценивания не опубликована"}
                      </small>
                    </span>
                  </Link>
                </td>
                <td data-label="Официальный итог / накоплено">
                  <span className={styles.gradeCell}>
                    <strong className={styles.gradeValue}>
                      {subject.resultValue ?? "—"}
                    </strong>
                    {subject.currentContribution !== null && (
                      <small className={styles.currentContribution}>
                        Накоплено {formatContribution(subject.currentContribution)} / 100
                      </small>
                    )}
                  </span>
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
  const displayedSemester =
    period === "current" ? selectedSemester : currentSemester;
  const completionPercent =
    displayedSemester && displayedSemester.totalCredits > 0
      ? Math.round(
          (displayedSemester.completedCredits / displayedSemester.totalCredits) *
            100,
        )
      : 0;
  const periodIndicatorClass =
    period === "current"
      ? styles.periodCurrent
      : period === "all"
        ? styles.periodAll
        : styles.periodDynamics;
  const handlePeriodKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    if (!tabs?.length) return;

    const currentIndex = Array.from(tabs).indexOf(event.currentTarget);
    const nextIndex =
        event.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : event.key === "ArrowLeft"
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : -1;
    if (nextIndex < 0) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    nextTab.focus();
    setPeriod(
      nextTab.id === "grades-period-all-tab"
        ? "all"
        : nextTab.id === "grades-period-dynamics-tab"
          ? "dynamics"
          : "current",
    );
  };

  if (!currentSemester) {
    return (
      <EmptyState
        className={styles.empty}
        description="Для этой учётной записи пока нет учебного плана."
        illustration="documents"
        title="Данные не найдены"
      />
    );
  }

  return (
    <div className={styles.overview}>
      <div className={styles.overviewHero}>
        <section className={styles.averageCard}>
          <span className={styles.currentSemesterBadge}>
            {displayedSemester?.isCurrent
              ? "Текущий семестр"
              : "Выбранный семестр"}
          </span>
          <strong className={styles.averageValue}>
            {formatAverage(displayedSemester?.average ?? null)} / 5
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
            {displayedSemester?.completedCredits ?? 0} зачётных единиц
          </span>
        </section>

        <div className={styles.overviewSummary}>
          <section className={styles.summaryCard}>
            <h2>Академический прогресс</h2>
            <div className={styles.progressLabel}>
              <span>
                Выполнено: {displayedSemester?.completedCredits ?? 0} из{" "}
                {displayedSemester?.totalCredits ?? 0} кредитов
              </span>
              <strong>{completionPercent} %</strong>
            </div>
            <div
              aria-label={`Академический прогресс: ${completionPercent}%`}
              className={styles.progressTrack}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercent}
            >
              <span style={{ width: `${completionPercent}%` }} />
            </div>
          </section>

          <section className={styles.summaryCard}>
            <h2>Статус обучения</h2>
            <span
              className={`${styles.studyStatus} ${
                displayedSemester?.debtCount
                  ? styles.studyStatusDebt
                  : styles.studyStatusGood
              }`}
            >
              {displayedSemester?.debtCount
                ? `Академическая задолженность: ${displayedSemester.debtCount}`
                : "Без академических задолженностей"}
            </span>
          </section>
        </div>
      </div>

      <div className={styles.periodControls}>
        <div
          aria-label="Период успеваемости"
          className={`${styles.periodTabs} ${periodIndicatorClass}`}
          role="tablist"
        >
          <button
            aria-controls="grades-period-panel"
            aria-selected={period === "current"}
            className={styles.periodTab}
            id="grades-period-current-tab"
            tabIndex={period === "current" ? 0 : -1}
            onKeyDown={handlePeriodKeyDown}
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
            tabIndex={period === "all" ? 0 : -1}
            onKeyDown={handlePeriodKeyDown}
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
            tabIndex={period === "dynamics" ? 0 : -1}
            onKeyDown={handlePeriodKeyDown}
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
                  <div
                    aria-label={`Средний балл: ${formatAverage(semester.average)} из 5`}
                    aria-valuemax={5}
                    aria-valuemin={0}
                    aria-valuenow={semester.average ?? 0}
                    className={styles.dynamicsTrack}
                    role="progressbar"
                  >
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

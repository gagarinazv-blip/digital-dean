"use client";

import { DateTimeStack } from "@/components/date-time-stack";
import { useState } from "react";
import { prepareGradeInputs } from "@/lib/grade-calculator-input";
import { analyzeGrade } from "@/lib/grade-analysis";
import type { GradebookEntry } from "@/lib/gradebook-data";
import styles from "./grade-calculator.module.css";

function ComponentIcon({ index }: { index: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {index % 3 === 0 ? (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" />
          <path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20" />
        </>
      ) : index % 3 === 1 ? (
        <>
          <path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M14 3v5h5M8 13h8M8 17h6" />
        </>
      ) : (
        <>
          <path d="m2 9 10-5 10 5-10 5z" />
          <path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" />
        </>
      )}
    </svg>
  );
}

type CalculatorEntry = GradebookEntry & { officialResult: string | null };

function getEntryKey(entry: CalculatorEntry) {
  return `${entry.formula.semesterCode}:${entry.formula.subjectId}`;
}

function formatPoints(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function GradeCalculator({
  entries,
  initialSubjectId,
}: {
  entries: readonly CalculatorEntry[];
  initialSubjectId?: string;
}) {
  const initialEntry =
    entries.find((item) => item.formula.subjectId === initialSubjectId) ??
    entries[0];
  const [selectedEntryKey, setSelectedEntryKey] = useState(
    initialEntry ? getEntryKey(initialEntry) : "",
  );
  const [valuesBySubject, setValuesBySubject] = useState<
    Record<string, Record<string, string>>
  >({});
  const entry =
    entries.find((item) => getEntryKey(item) === selectedEntryKey) ??
    entries[0];

  if (!entry) return null;

  const { formula } = entry;
  const entryKey = getEntryKey(entry);
  const values = valuesBySubject[entryKey] ?? {};
  const { hypotheses, errors } = prepareGradeInputs(
    formula,
    entry.scores,
    values,
  );
  const analysis = analyzeGrade(
    formula,
    entry.scores,
    hypotheses,
    entry.officialResult,
    entry.components,
  );
  const calculation = analysis.forecastCalculation;
  const componentNames = new Map(
    formula.components.map((component) => [component.code, component.name]),
  );
  const missingNames = calculation.missingComponents.map(
    (code) => componentNames.get(code) ?? code,
  );
  const outcome =
    calculation.grade === null
      ? "Оценка пока не определена"
      : calculation.passed
        ? `Прогнозная оценка: ${calculation.grade} · зачтено`
        : `Прогнозная оценка: ${calculation.grade} · не сдано`;

  function setHypothesis(code: string, value: string) {
    setValuesBySubject((current) => ({
      ...current,
      [entryKey]: {
        ...current[entryKey],
        [code]: value,
      },
    }));
  }

  return (
    <section aria-labelledby="grade-calculator-title" className={styles.panel}>
      <header className={styles.heading}>
        <div>
          <h2 id="grade-calculator-title">Калькулятор прогноза</h2>
          <p className={styles.subjectName}>
            {formula.subjectName} ·{" "}
            {formula.source === "DEMONSTRATION"
              ? "демонстрационная формула"
              : "опубликованная формула"}
          </p>
        </div>
        {entries.length > 1 ? (
          <label className={styles.subjectPicker}>
            <span>Дисциплина</span>
            <select
              onChange={(event) => setSelectedEntryKey(event.target.value)}
              value={entryKey}
            >
              {entries.map((item) => (
                <option
                  key={getEntryKey(item)}
                  value={getEntryKey(item)}
                >
                  {item.formula.subjectName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className={styles.forecastBadge}>Прогноз</span>
        )}
      </header>

      <div className={styles.disclaimer}>
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
        <span>
          <strong>Это прогноз, а не официальная оценка</strong>
          <small>
            Фактические оценки нельзя изменить. Гипотезы действуют только пока
            открыта эта страница и не сохраняются.
          </small>
        </span>
      </div>
      <p className={styles.sourceNote}>{formula.sourceNote}</p>

      <div className={styles.calculatorGrid}>
        <section
          aria-labelledby="grade-components-title"
          className={styles.componentsPanel}
        >
          <div className={styles.panelHeading}>
            <div>
              <h3 id="grade-components-title">Компоненты оценки</h3>
              <p>
                Полученные баллы зафиксированы. Введите гипотезы только для
                компонентов, по которым оценки ещё нет.
              </p>
            </div>
          </div>

          <ul className={styles.componentList}>
            {formula.components.map((component, index) => {
              const details = entry.components[component.code];
              const receivedScore = entry.scores[component.code];
              const isReceived = receivedScore !== undefined;
              const inputId = `grade-input-${component.code}`;
              const descriptionId = `grade-description-${component.code}`;
              const error = errors[component.code];
              const score = isReceived
                ? receivedScore
                : hypotheses[component.code];
              const inputValue = values[component.code] ?? "";
              const progress =
                score === undefined ? 0 : (score / component.maxPoints) * 100;

              return (
                <li className={styles.component} key={component.code}>
                  <span className={styles.componentIcon}>
                    <ComponentIcon index={index} />
                  </span>
                  <div className={styles.componentMain}>
                    <div className={styles.componentHeading}>
                      <h4>{component.name}</h4>
                      <span className={styles.weightBadge}>
                        {component.weight}%
                      </span>
                    </div>
                    <p className={styles.componentMeta}>
                      Максимум {component.maxPoints} баллов
                    </p>
                    {details.date ? (
                      <DateTimeStack allDay value={details.date} />
                    ) : null}

                    {isReceived ? (
                      <div className={styles.receivedScore}>
                        <strong>
                          Получено: {formatPoints(receivedScore)} /{" "}
                          {component.maxPoints}
                        </strong>
                        {details.comment && <span>{details.comment}</span>}
                      </div>
                    ) : (
                      <div className={styles.field}>
                        <label htmlFor={inputId}>
                          Гипотеза (0–{component.maxPoints})
                        </label>
                        <div className={styles.scoreControls}>
                          <input
                            aria-describedby={descriptionId}
                            aria-invalid={Boolean(error)}
                            autoComplete="off"
                            className={
                              error ? styles.invalidInput : styles.input
                            }
                            id={inputId}
                            inputMode="decimal"
                            maxLength={24}
                            onChange={(event) =>
                              setHypothesis(
                                component.code,
                                event.currentTarget.value,
                              )
                            }
                            placeholder={`0–${component.maxPoints}`}
                            type="text"
                            value={inputValue}
                          />
                          <span className={styles.scoreMaximum}>
                            / {component.maxPoints}
                          </span>
                        </div>
                        <input
                          aria-label={`Гипотеза баллов за ${component.name}`}
                          aria-describedby={descriptionId}
                          aria-invalid={Boolean(error)}
                          aria-valuetext={`${score ?? 0} из ${component.maxPoints} баллов`}
                          className={styles.range}
                          max={component.maxPoints}
                          min={0}
                          onChange={(event) =>
                            setHypothesis(
                              component.code,
                              event.currentTarget.value,
                            )
                          }
                          step="0.1"
                          type="range"
                          value={score ?? 0}
                        />
                        <p
                          className={error ? styles.error : styles.help}
                          id={descriptionId}
                        >
                          {error ??
                            "Не сохраняется и не влияет на официальный итог."}
                        </p>
                      </div>
                    )}
                    <div
                      aria-hidden="true"
                      className={styles.progressTrack}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            className={styles.resetButton}
            onClick={() =>
              setValuesBySubject((current) => ({
                ...current,
                [entryKey]: {},
              }))
            }
            type="button"
          >
            Сбросить гипотезы
          </button>
        </section>

        <div className={styles.resultColumn}>
          <section
            aria-atomic="true"
            aria-labelledby="grade-result-title"
            aria-live="polite"
            className={styles.scoreCard}
          >
            <h3 id="grade-result-title">Прогноз результата</h3>
            <div className={styles.scoreHero}>
              <strong className={styles.totalScore}>
                {calculation.totalPoints} / 100
              </strong>
              <span className={styles.gradeSummary}>
                {outcome}
              </span>
              <div className={styles.resultTrack} aria-hidden="true">
                <span
                  style={{
                    width: `${calculation.totalPoints}%`,
                  }}
                />
              </div>
            </div>
            <div className={styles.officialResult}>
              <span>Официальный итог</span>
              <strong>{entry.officialResult ?? "Не выставлен"}</strong>
            </div>
            {calculation.missingComponents.length > 0 && (
              <div className={styles.resultNote}>
                {analysis.remainingWeight}% веса ещё не оценено
                {missingNames.length > 0
                  ? ` · Не заполнены гипотезы: ${missingNames.join(", ")}`
                  : ""}
              </div>
            )}
            {calculation.notes.length > 0 && (
              <ul className={styles.notes}>
                {calculation.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.calculationCard}>
            <h3>Расчёт</h3>
            <ul className={styles.breakdown}>
              {formula.components.map((component) => {
                const grade = analysis.components.find(
                  (item) => item.code === component.code,
                );

                return (
                  <li key={component.code}>
                    <span>{component.name}</span>
                    <strong>
                      {grade?.status === "RECEIVED"
                        ? `Факт: ${formatPoints(grade.score ?? 0)} / ${component.maxPoints} · вклад ${formatPoints(grade.currentContribution ?? 0)}`
                        : grade?.status === "HYPOTHESIS"
                          ? `Гипотеза: ${formatPoints(grade.score ?? 0)} / ${component.maxPoints} · вклад ${formatPoints(grade.forecastContribution ?? 0)}`
                          : "Гипотеза не задана"}
                    </strong>
                  </li>
                );
              })}
              <li className={styles.breakdownTotal}>
                <span>Итого</span>
                <strong>
                  {calculation.grade === null
                    ? `${calculation.totalPoints} / 100 · промежуточный прогноз`
                    : `${calculation.totalPoints} / 100 · прогноз`}
                </strong>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}

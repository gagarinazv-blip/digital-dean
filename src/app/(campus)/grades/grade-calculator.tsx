"use client";

import { useState } from "react";
import { prepareGradeInputs } from "@/lib/grade-calculator-input";
import {
  calculateGrade,
  type GradeFormula,
} from "@/lib/grade-formula";
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

export function GradeCalculator({ formula }: { formula: GradeFormula }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const { scores, errors } = prepareGradeInputs(formula, values);
  const calculation = calculateGrade(formula, scores);
  const componentNames = new Map(
    formula.components.map((component) => [component.id, component.name]),
  );
  const missingNames = calculation.missingComponents.map(
    (id) => componentNames.get(id) ?? id,
  );
  const outcome =
    calculation.passed === null
      ? "Ещё не определено"
      : calculation.passed
        ? "Сдано"
        : "Не сдано";

  return (
    <section aria-labelledby="grade-calculator-title" className={styles.panel}>
      <header className={styles.heading}>
        <div>
          <h2 id="grade-calculator-title">Калькулятор оценки</h2>
          <p className={styles.subjectName}>
            {formula.subjectName} · прогноз для себя
          </p>
        </div>
        <span className={styles.forecastBadge}>Прогноз</span>
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
            Фактические оценки доступны только для чтения. Значения прогноза не
            сохраняются в журнал.
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
                Все компоненты можно менять для прогноза; полученные баллы
                подставлены как начальные значения.
              </p>
            </div>
          </div>

          <ul className={styles.componentList}>
            {formula.components.map((component, index) => {
              const inputId = `grade-input-${component.id}`;
              const descriptionId = `grade-description-${component.id}`;
              const error = errors[component.id];
              const score = scores[component.id];
              const inputValue =
                values[component.id] ??
                (component.status === "RECEIVED"
                  ? String(component.baselineScore)
                  : "");
              const progress =
                score === undefined ? 0 : (score / component.maxPoints) * 100;

              return (
                <li className={styles.component} key={component.id}>
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
                      {component.status === "RECEIVED"
                        ? "Начальное значение"
                        : "Будущий компонент"}{" "}
                      · максимум {component.maxPoints} баллов
                    </p>

                    <div className={styles.field}>
                      <label htmlFor={inputId}>
                        Балл для прогноза (0–{component.maxPoints})
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
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setValues((current) => ({
                              ...current,
                              [component.id]: nextValue,
                            }));
                          }}
                          placeholder={`0–${component.maxPoints}`}
                          type="text"
                          value={inputValue}
                        />
                        <span className={styles.scoreMaximum}>
                          / {component.maxPoints}
                        </span>
                      </div>
                      <input
                        aria-label={`Балл для прогноза за ${component.name}`}
                        aria-describedby={descriptionId}
                        aria-invalid={Boolean(error)}
                        aria-valuetext={`${score ?? 0} из ${component.maxPoints} баллов`}
                        className={styles.range}
                        max={component.maxPoints}
                        min={0}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setValues((current) => ({
                            ...current,
                            [component.id]: nextValue,
                          }));
                        }}
                        step="0.1"
                        type="range"
                        value={score ?? 0}
                      />
                      <p
                        className={error ? styles.error : styles.help}
                        id={descriptionId}
                      >
                        {error ??
                          "Значение используется только в прогнозе и не сохраняется."}
                      </p>
                    </div>
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
            onClick={() => setValues({})}
            type="button"
          >
            Сбросить значения
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
                {calculation.grade === null
                  ? "— / 100"
                  : `${calculation.totalPoints} / 100`}
              </strong>
              <span className={styles.gradeSummary}>
                {calculation.grade === null
                  ? "Итог пока не определён"
                  : `Оценка: ${calculation.grade} · ${outcome}`}
              </span>
              <div className={styles.resultTrack} aria-hidden="true">
                <span
                  style={{
                    width: `${calculation.totalPoints}%`,
                  }}
                />
              </div>
            </div>
            {calculation.missingComponents.length > 0 && (
              <div className={styles.resultNote}>
                Не хватает: {missingNames.join(", ")}
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
                const score = scores[component.id];
                const contribution =
                  score === undefined
                    ? null
                    : ((score / component.maxPoints) * component.weight).toFixed(
                        1,
                      );

                return (
                  <li key={component.id}>
                    <span>{component.name}</span>
                    <strong>
                      {score === undefined
                        ? "Не задано"
                        : `${score} / ${component.maxPoints} × ${component.weight}% = ${contribution}`}
                    </strong>
                  </li>
                );
              })}
              <li className={styles.breakdownTotal}>
                <span>Итого</span>
                <strong>
                  {calculation.grade === null
                    ? `${calculation.totalPoints} / 100 · не итог`
                    : `${calculation.totalPoints} / 100`}
                </strong>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}

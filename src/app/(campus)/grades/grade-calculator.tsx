"use client";

import { useState } from "react";
import { prepareGradeInputs } from "@/lib/grade-calculator-input";
import {
  calculateGrade,
  type GradeFormula,
} from "@/lib/grade-formula";
import styles from "./grade-calculator.module.css";

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
      <div className={styles.heading}>
        <div>
          <h2 id="grade-calculator-title">Калькулятор оценки</h2>
          <p className={styles.subjectName}>{formula.subjectName}</p>
        </div>
        <span className={styles.forecastBadge}>Прогноз</span>
      </div>

      <p className={styles.disclaimer}>
        Это прогноз, а не официальная оценка. Введённые гипотезы хранятся
        только на экране и не сохраняются.
      </p>
      <p className={styles.sourceNote}>{formula.sourceNote}</p>

      <ul className={styles.componentList}>
        {formula.components.map((component) => {
          const inputId = `grade-input-${component.id}`;
          const descriptionId = `grade-description-${component.id}`;
          const error = errors[component.id];

          return (
            <li className={styles.component} key={component.id}>
              <div className={styles.componentHeading}>
                <h3>{component.name}</h3>
                <span
                  className={
                    component.status === "RECEIVED"
                      ? styles.receivedBadge
                      : styles.missingBadge
                  }
                >
                  {component.status === "RECEIVED"
                    ? "Получено"
                    : "Не получено"}
                </span>
              </div>
              <p className={styles.componentMeta}>
                Вес: {component.weight}% · максимум: {component.maxPoints}{" "}
                баллов
              </p>

              {component.status === "RECEIVED" ? (
                <p className={styles.fixedScore}>
                  Баллы: <strong>{component.baselineScore}</strong> из{" "}
                  {component.maxPoints}
                </p>
              ) : (
                <div className={styles.field}>
                  <label htmlFor={inputId}>
                    Гипотетический балл (0–{component.maxPoints})
                  </label>
                  <input
                    aria-describedby={descriptionId}
                    aria-invalid={Boolean(error)}
                    autoComplete="off"
                    className={error ? styles.invalidInput : styles.input}
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
                    placeholder="Например, 18 или 18,5"
                    type="text"
                    value={values[component.id] ?? ""}
                  />
                  <p
                    className={error ? styles.error : styles.help}
                    id={descriptionId}
                  >
                    {error ??
                      "Можно оставить пустым; допустимы запятая и точка."}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section
        aria-atomic="true"
        aria-labelledby="grade-result-title"
        aria-live="polite"
        className={styles.result}
      >
        <h3 id="grade-result-title">Результат прогноза</h3>
        <dl className={styles.resultGrid}>
          <div>
            <dt>Итоговые баллы</dt>
            <dd>
              {calculation.grade === null
                ? "Ещё не определены"
                : `${calculation.totalPoints} из 100`}
            </dd>
          </div>
          {calculation.missingComponents.length > 0 && (
            <div>
              <dt>Известный вклад</dt>
              <dd>{calculation.totalPoints} из 100</dd>
            </div>
          )}
          <div>
            <dt>Оценка</dt>
            <dd>{calculation.grade ?? "Ещё не определена"}</dd>
          </div>
          <div>
            <dt>Статус</dt>
            <dd>{outcome}</dd>
          </div>
        </dl>

        {missingNames.length > 0 && (
          <div className={styles.resultDetails}>
            <h4>Недостающие компоненты</h4>
            <ul>
              {missingNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}

        {calculation.notes.length > 0 && (
          <div className={styles.resultDetails}>
            <h4>Пояснения</h4>
            <ul>
              {calculation.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <button
        className={styles.resetButton}
        onClick={() => setValues({})}
        type="button"
      >
        Сбросить гипотезы
      </button>
    </section>
  );
}

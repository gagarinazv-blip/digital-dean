"use client";

import { useState } from "react";
import { Check, Minus, Plus, Undo } from "iconoir-react";
import { DateTimeStack } from "@/components/date-time-stack";
import controls from "@/components/ui/controls.module.css";
import { analyzeGrade } from "@/lib/grade-analysis";
import { getAverageGrade } from "@/lib/grade-average";
import { prepareGradeInputs } from "@/lib/grade-calculator-input";
import {
  getForecastRange,
  planForTarget,
  type TargetGrade,
} from "@/lib/grade-forecast";
import type { GradeCalculation } from "@/lib/grade-formula";
import type { GradebookEntry } from "@/lib/gradebook-data";
import styles from "./grade-calculator.module.css";

export type CalculatorEntry = GradebookEntry & {
  controlLabel: string;
  /** Зачёт без оценки в средний балл не входит. */
  isGraded: boolean;
  isCurrent: boolean;
  officialResult: string | null;
  semesterName: string;
};

type Values = Record<string, string>;

const targets: readonly TargetGrade[] = [3, 4, 5];

const gradeNames: Record<number, string> = {
  2: "неудовлетворительно",
  3: "удовлетворительно",
  4: "хорошо",
  5: "отлично",
};

const sourceLabels = {
  PUBLISHED: "Опубликованная формула",
  DEMONSTRATION: "Демонстрационная формула",
  TYPICAL: "Типовая схема",
} as const;

const pointsFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

function formatPoints(value: number): string {
  return pointsFormatter.format(value);
}

function getEntryKey(entry: CalculatorEntry): string {
  return `${entry.formula.semesterCode}:${entry.formula.subjectId}`;
}

function forecast(entry: CalculatorEntry, values: Values) {
  const inputs = prepareGradeInputs(entry.formula, entry.scores, values);
  const scores = { ...inputs.facts, ...inputs.hypotheses };
  const analysis = analyzeGrade(
    entry.formula,
    inputs.facts,
    inputs.hypotheses,
    entry.officialResult,
    entry.components,
  );
  return { ...inputs, scores, analysis, calculation: analysis.forecastCalculation };
}

/** Короткий итог: «5» для оценки, «зачтено» для зачёта, null — данных мало. */
function getOutcome(
  entry: CalculatorEntry,
  calculation: GradeCalculation,
): string | null {
  if (calculation.grade === null) return null;
  if (entry.isGraded) return String(calculation.grade);
  return calculation.passed ? "зачтено" : "не зачтено";
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
    entries.find((item) => item.isCurrent) ??
    entries[0];
  const [selectedKey, setSelectedKey] = useState(
    initialEntry ? getEntryKey(initialEntry) : "",
  );
  const [valuesBySubject, setValuesBySubject] = useState<Record<string, Values>>(
    {},
  );
  const entry =
    entries.find((item) => getEntryKey(item) === selectedKey) ?? entries[0];

  if (!entry) return null;

  const semesters = [
    ...new Map(entries.map((item) => [item.formula.semesterCode, item])).values(),
  ].sort((first, second) => Number(second.isCurrent) - Number(first.isCurrent));
  const summaries = new Map(
    entries.map((item) => {
      const key = getEntryKey(item);
      const values = valuesBySubject[key] ?? {};
      const result = forecast(item, values);
      const hasHypotheses = Object.keys(result.hypotheses).length > 0;
      return [
        key,
        {
          hasHypotheses,
          outcome: getOutcome(item, result.calculation),
          // Пока студент ничего не предположил, действует официальный итог.
          grade:
            !hasHypotheses && item.officialResult
              ? item.officialResult
              : result.calculation.grade === null
                ? undefined
                : String(result.calculation.grade),
        },
      ] as const;
    }),
  );
  const graded = entries.filter(
    (item) =>
      item.isGraded && item.formula.semesterCode === entry.formula.semesterCode,
  );
  const grades = graded
    .map((item) => summaries.get(getEntryKey(item))?.grade)
    .filter((grade) => grade !== undefined);
  const average = getAverageGrade(grades);

  return (
    <section aria-labelledby="grade-calculator-title" className={styles.panel}>
      <header className={styles.heading}>
        <div>
          <h2 id="grade-calculator-title">Калькулятор оценки</h2>
          <p>
            Меняйте баллы как угодно: это примерка. Настоящие оценки останутся
            прежними, а предположения исчезнут, когда вы закроете страницу.
          </p>
        </div>
        <dl className={styles.average}>
          <dt>Прогноз среднего балла</dt>
          <dd>
            {average === null ? "—" : average.toFixed(1).replace(".", ",")}
            <span>
              {" "}
              по {grades.length} из {graded.length}
            </span>
          </dd>
        </dl>
      </header>

      <div className={styles.layout}>
        <nav aria-label="Дисциплины" className={styles.subjects}>
          {semesters.map((semester) => (
            <details
              className={styles.semester}
              key={semester.formula.semesterCode}
              open={
                semester.isCurrent ||
                semester.formula.semesterCode === initialEntry?.formula.semesterCode
              }
            >
              <summary>{semester.semesterName} семестр</summary>
              <ul>
                {entries
                  .filter(
                    (item) =>
                      item.formula.semesterCode === semester.formula.semesterCode,
                  )
                  .map((item) => {
                    const key = getEntryKey(item);
                    const summary = summaries.get(key);
                    const shown =
                      !summary?.hasHypotheses && item.officialResult
                        ? item.officialResult
                        : summary?.outcome;
                    return (
                      <li key={key}>
                        <button
                          aria-current={key === selectedKey ? "true" : undefined}
                          className={styles.subject}
                          onClick={() => setSelectedKey(key)}
                          type="button"
                        >
                          <span className={styles.subjectText}>
                            <strong>{item.formula.subjectName}</strong>
                            <span>{item.controlLabel}</span>
                          </span>
                          <span
                            className={styles.subjectGrade}
                            data-hypothesis={summary?.hasHypotheses || undefined}
                          >
                            <span className={controls.visuallyHidden}>
                              {summary?.hasHypotheses ? "прогноз: " : "итог: "}
                            </span>
                            {shown ?? "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </details>
          ))}
        </nav>

        <SubjectCalculator
          entry={entry}
          key={selectedKey}
          onChange={(values) =>
            setValuesBySubject((current) => ({ ...current, [selectedKey]: values }))
          }
          values={valuesBySubject[selectedKey] ?? {}}
        />
      </div>
    </section>
  );
}

function SubjectCalculator({
  entry,
  onChange,
  values,
}: {
  entry: CalculatorEntry;
  onChange: (values: Values) => void;
  values: Values;
}) {
  const [target, setTarget] = useState<TargetGrade | null>(null);
  const { formula } = entry;
  const { analysis, calculation, errors, hypotheses, scores } = forecast(
    entry,
    values,
  );
  const range = getForecastRange(formula, scores);
  const outcome = getOutcome(entry, calculation);
  const hypothesisCount = Object.keys(hypotheses).length;
  // Подбираем только то, за что ещё нет балла; остальное считаем заданным.
  const openCodes = formula.components
    .filter(({ code }) => entry.scores[code] === undefined)
    .map(({ code }) => code);
  const plan = target ? planForTarget(formula, scores, openCodes, target) : null;
  const threshold = (grade: TargetGrade) =>
    formula.scale.find((band) => band.grade === grade)?.minimumPoints ?? 0;
  const visibleTargets = entry.isGraded ? targets : ([3] as const);

  function setValue(code: string, value: string) {
    onChange({ ...values, [code]: value });
  }

  function clearValue(code: string) {
    const next = { ...values };
    delete next[code];
    onChange(next);
  }

  return (
    <div className={styles.workspace}>
      <section
        aria-labelledby="calculator-components-title"
        className={styles.components}
      >
        <header className={styles.componentsHeading}>
          <div>
            <h3 id="calculator-components-title">{formula.subjectName}</h3>
            <p>
              {entry.controlLabel} · {sourceLabels[formula.source]}
            </p>
          </div>
          <button
            className={controls.secondary}
            disabled={hypothesisCount === 0 && Object.keys(errors).length === 0}
            onClick={() => {
              setTarget(null);
              onChange({});
            }}
            type="button"
          >
            <Undo aria-hidden="true" height={18} width={18} />
            Сбросить
          </button>
        </header>

        <ul>
          {formula.components.map((component) => {
            const received = entry.scores[component.code];
            const hypothesis = hypotheses[component.code];
            const error = errors[component.code];
            const score = scores[component.code];
            const details = entry.components[component.code];
            const result = analysis.components.find(
              ({ code }) => code === component.code,
            );
            const inputId = `grade-input-${component.code}`;
            const helpId = `grade-help-${component.code}`;
            const state =
              hypothesis !== undefined
                ? "hypothesis"
                : received !== undefined
                  ? "fact"
                  : "empty";
            const stepTo = (delta: number) => {
              const next = Math.min(
                component.maxPoints,
                Math.max(0, (score ?? 0) + delta),
              );
              setValue(component.code, formatPoints(next).replace(/\s/g, ""));
            };

            return (
              <li className={styles.component} data-state={state} key={component.code}>
                <div className={styles.componentTop}>
                  <label htmlFor={inputId}>{component.name}</label>
                  <span className={styles.weight}>{component.weight}% итога</span>
                </div>
                <div className={styles.control}>
                  <div className={styles.slider}>
                    <input
                      aria-label={`${component.name}: предполагаемый балл`}
                      aria-valuetext={`${formatPoints(score ?? 0)} из ${component.maxPoints}`}
                      max={component.maxPoints}
                      min={0}
                      onChange={(event) =>
                        setValue(component.code, event.currentTarget.value)
                      }
                      step={0.5}
                      style={
                        {
                          "--share": `${((score ?? 0) / component.maxPoints) * 100}%`,
                        } as React.CSSProperties
                      }
                      type="range"
                      value={score ?? 0}
                    />
                    {received !== undefined ? (
                      <span
                        aria-hidden="true"
                        className={styles.factMark}
                        style={
                          {
                            "--fact": received / component.maxPoints,
                          } as React.CSSProperties
                        }
                      />
                    ) : null}
                  </div>
                  <div className={styles.number}>
                    <button
                      aria-label={`${component.name}: меньше на балл`}
                      disabled={(score ?? 0) <= 0}
                      onClick={() => stepTo(-1)}
                      type="button"
                    >
                      <Minus aria-hidden="true" />
                    </button>
                    <input
                      aria-describedby={helpId}
                      aria-invalid={error ? true : undefined}
                      autoComplete="off"
                      id={inputId}
                      inputMode="decimal"
                      maxLength={8}
                      onChange={(event) =>
                        setValue(component.code, event.currentTarget.value)
                      }
                      onBlur={() => {
                        // Стёртое поле снова показывает полученный балл.
                        if (values[component.code]?.trim() === "") {
                          clearValue(component.code);
                        }
                      }}
                      onFocus={(event) => event.currentTarget.select()}
                      placeholder="—"
                      type="text"
                      value={
                        values[component.code] ??
                        (received === undefined ? "" : formatPoints(received))
                      }
                    />
                    <span aria-hidden="true">/ {component.maxPoints}</span>
                    <button
                      aria-label={`${component.name}: больше на балл`}
                      disabled={(score ?? 0) >= component.maxPoints}
                      onClick={() => stepTo(1)}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className={styles.componentBottom}>
                  <p className={error ? styles.error : styles.help} id={helpId}>
                    {error ? (
                      error
                    ) : state === "hypothesis" ? (
                      <>
                        <span className={styles.badge}>Предположение</span>
                        {received === undefined
                          ? null
                          : ` на деле ${formatPoints(received)}`}
                      </>
                    ) : state === "fact" ? (
                      <>
                        Получено
                        {details?.date ? (
                          <>
                            {" "}
                            <DateTimeStack allDay value={details.date} variant="moment" />
                          </>
                        ) : null}
                        {details?.comment ? ` · ${details.comment}` : null}
                      </>
                    ) : (
                      "Балла ещё нет, попробуйте свой"
                    )}
                  </p>
                  <span className={styles.contribution}>
                    {values[component.code] !== undefined ? (
                      <button
                        className={styles.revert}
                        onClick={() => clearValue(component.code)}
                        type="button"
                      >
                        {received === undefined ? "Очистить" : "Вернуть"}
                        <span className={controls.visuallyHidden}>
                          : {component.name}
                        </span>
                      </button>
                    ) : null}
                    +{formatPoints(result?.forecastContribution ?? result?.currentContribution ?? 0)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        {formula.source === "PUBLISHED" ? null : (
          <p className={styles.note}>{formula.sourceNote}</p>
        )}
      </section>

      <aside aria-labelledby="calculator-result-title" className={styles.result}>
        <div aria-atomic="true" aria-live="polite" className={styles.resultMain}>
          <h3 id="calculator-result-title">
            {hypothesisCount > 0 ? "Прогноз" : "По текущим баллам"}
          </h3>
          <p className={styles.total}>
            <strong>{calculation.totalPoints}</strong> / 100
          </p>
          <p className={styles.outcome}>
            {outcome === null
              ? `Оценено не всё: итог может быть от ${range.minimum} до ${range.maximum}`
              : entry.isGraded && calculation.grade
                ? `Оценка ${outcome}, ${gradeNames[calculation.grade]}`
                : outcome}
          </p>
        </div>

        <div
          aria-hidden="true"
          className={styles.scale}
          style={
            {
              "--from": `${range.minimum}%`,
              "--to": `${range.maximum}%`,
              "--now": `${calculation.totalPoints}%`,
            } as React.CSSProperties
          }
        >
          <span className={styles.scaleRange} />
          <span className={styles.scaleNow} />
          {visibleTargets.map((grade) => (
            <span
              className={styles.scaleMark}
              data-reached={calculation.totalPoints >= threshold(grade) || undefined}
              key={grade}
              style={{ left: `${threshold(grade)}%` }}
            >
              {entry.isGraded ? grade : "зачёт"}
            </span>
          ))}
        </div>

        <div className={styles.target}>
          <p id="calculator-target-title">
            {entry.isGraded ? "Хочу получить" : "Хочу зачёт"}
          </p>
          <div
            aria-labelledby="calculator-target-title"
            className={styles.targetButtons}
            role="group"
          >
            {visibleTargets.map((grade) => (
              <button
                aria-pressed={target === grade}
                key={grade}
                onClick={() => setTarget(target === grade ? null : grade)}
                type="button"
              >
                {entry.isGraded ? grade : "Сколько нужно?"}
              </button>
            ))}
          </div>
          <div aria-live="polite" className={styles.plan}>
            {plan?.kind === "reached" ? (
              <p>
                <Check aria-hidden="true" /> Уже обеспечено
                {openCodes.length > 0 ? ", даже если дальше будут нули." : "."}
              </p>
            ) : plan?.kind === "impossible" ? (
              <p>
                {openCodes.length > 0
                  ? `Даже с максимумом за остальное выйдет ${plan.maximum}. Нужно ${threshold(target ?? 3)}.`
                  : `Все баллы уже стоят: ${plan.maximum} из нужных ${threshold(target ?? 3)}. Измените любой выше и посмотрите, что было бы.`}
              </p>
            ) : plan?.kind === "plan" ? (
              <>
                <p>Нужно набрать не меньше:</p>
                <ul>
                  {formula.components
                    .filter(({ code }) => plan.scores[code] !== undefined)
                    .map((component) => (
                      <li key={component.code}>
                        <span>{component.name}</span>
                        <strong>
                          {formatPoints(plan.scores[component.code])} /{" "}
                          {component.maxPoints}
                        </strong>
                      </li>
                    ))}
                </ul>
                <button
                  className={controls.primary}
                  onClick={() =>
                    onChange({
                      ...values,
                      ...Object.fromEntries(
                        Object.entries(plan.scores).map(([code, score]) => [
                          code,
                          formatPoints(score),
                        ]),
                      ),
                    })
                  }
                  type="button"
                >
                  Подставить эти баллы
                </button>
              </>
            ) : null}
          </div>
        </div>

        <p className={styles.official}>
          <span>Официальный итог</span>
          <strong>{entry.officialResult ?? "не выставлен"}</strong>
        </p>
      </aside>
    </div>
  );
}

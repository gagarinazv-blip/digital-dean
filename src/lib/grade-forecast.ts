import { calculateGrade, type GradeFormula } from "@/lib/grade-formula";

export type TargetGrade = 3 | 4 | 5;

export type TargetPlan =
  /** Оценка обеспечена, даже если дальше ставить нули. */
  | { kind: "reached" }
  /** Даже с максимумом за всё остальное оценки не будет. */
  | { kind: "impossible"; maximum: number }
  | { kind: "plan"; percent: number; scores: Record<string, number> };

/** Итог при нулях и при максимуме за всё, что ещё не задано. */
export function getForecastRange(
  formula: GradeFormula,
  scores: Readonly<Record<string, number>>,
): { minimum: number; maximum: number } {
  const fill = (share: number) =>
    calculateGrade(
      formula,
      Object.fromEntries(
        formula.components.map(({ code, maxPoints }) => [
          code,
          scores[code] ?? maxPoints * share,
        ]),
      ),
    ).totalPoints;
  return { minimum: fill(0), maximum: fill(1) };
}

/** Одинаковая доля от максимума за каждый открытый компонент, с точностью 0,1. */
function getScoresAtPercent(
  formula: GradeFormula,
  openCodes: ReadonlySet<string>,
  percent: number,
): Record<string, number> {
  return Object.fromEntries(
    formula.components
      .filter(({ code }) => openCodes.has(code))
      .map(({ code, maxPoints }) => [
        code,
        Math.min(maxPoints, Math.ceil((maxPoints * percent) / 10) / 10),
      ]),
  );
}

/**
 * Сколько нужно набрать за открытые компоненты, чтобы получить оценку.
 * scores — баллы, которые считаются заданными, openCodes — что подбираем.
 */
export function planForTarget(
  formula: GradeFormula,
  scores: Readonly<Record<string, number>>,
  openCodes: readonly string[],
  target: TargetGrade,
): TargetPlan {
  const open = new Set(openCodes);
  const fixed = Object.fromEntries(
    formula.components
      .filter(({ code }) => !open.has(code))
      .map(({ code }) => [code, scores[code] ?? 0]),
  );
  const calculate = (percent: number) => {
    const planned = getScoresAtPercent(formula, open, percent);
    return { planned, result: calculateGrade(formula, { ...fixed, ...planned }) };
  };
  const isEnough = (percent: number) =>
    (calculate(percent).result.grade ?? 0) >= target;

  if (isEnough(0)) return { kind: "reached" };
  const best = calculate(100).result;
  if (!isEnough(100)) return { kind: "impossible", maximum: best.totalPoints };

  let low = 1;
  let high = 100;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (isEnough(middle)) high = middle;
    else low = middle + 1;
  }
  return { kind: "plan", percent: low, scores: calculate(low).planned };
}

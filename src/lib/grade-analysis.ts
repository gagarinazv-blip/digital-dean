import {
  calculateGrade,
  validateGradeFormula,
  type GradeCalculation,
  type GradeFormula,
} from "@/lib/grade-formula";

export type ComponentGradeStatus =
  | "RECEIVED"
  | "NOT_RECEIVED"
  | "HYPOTHESIS";

export type GradeAnalysis = {
  components: {
    code: string;
    name: string;
    status: ComponentGradeStatus;
    score: number | null;
    maxPoints: number;
    weight: number;
    date: string | null;
    comment: string | null;
    currentContribution: number | null;
    forecastContribution: number | null;
  }[];
  accumulatedContribution: number;
  remainingComponents: {
    code: string;
    name: string;
    maxPoints: number;
    weight: number;
  }[];
  remainingMaximumPoints: number;
  remainingWeight: number;
  currentCalculation: GradeCalculation;
  forecastCalculation: GradeCalculation;
  forecastComplete: boolean;
  officialResult: string | null;
  minimumScores: {
    componentCode: string;
    grade: 3 | 4 | 5;
    score: number | null;
  }[];
};

export function analyzeGrade(
  formula: GradeFormula,
  receivedScores: Readonly<Record<string, number>>,
  hypotheses: Readonly<Record<string, number>> = {},
  officialResult: string | null = null,
  gradeDetails: Readonly<
    Record<string, { date: string | null; comment: string | null }>
  > = {},
): GradeAnalysis {
  validateGradeFormula(formula);
  for (const code of Object.keys(receivedScores)) {
    if (Object.prototype.hasOwnProperty.call(hypotheses, code)) {
      throw new TypeError(
        `Нельзя задать гипотезу для уже оценённого компонента "${code}".`,
      );
    }
  }

  const forecastScores = { ...receivedScores, ...hypotheses };
  const currentCalculation = calculateGrade(formula, receivedScores);
  const forecastCalculation = calculateGrade(formula, forecastScores);
  let accumulatedContribution = 0;
  let remainingMaximumPoints = 0;
  let remainingWeight = 0;

  const components = formula.components.map((component) => {
    const hasReceivedScore = Object.prototype.hasOwnProperty.call(
      receivedScores,
      component.code,
    );
    const hasHypothesis = Object.prototype.hasOwnProperty.call(
      hypotheses,
      component.code,
    );
    const actualScore = hasReceivedScore
      ? receivedScores[component.code]
      : undefined;
    const forecastScore = hasHypothesis
      ? hypotheses[component.code]
      : actualScore;
    const currentRawContribution =
      actualScore === undefined
        ? null
        : (actualScore / component.maxPoints) * component.weight;
    const forecastRawContribution =
      forecastScore === undefined
        ? null
        : (forecastScore / component.maxPoints) * component.weight;
    const status: ComponentGradeStatus = hasReceivedScore
      ? "RECEIVED"
      : hasHypothesis
        ? "HYPOTHESIS"
        : "NOT_RECEIVED";

    if (currentRawContribution !== null) {
      accumulatedContribution += currentRawContribution;
    } else {
      remainingMaximumPoints += component.maxPoints;
      remainingWeight += component.weight;
    }

    return {
      code: component.code,
      name: component.name,
      status,
      score: forecastScore ?? null,
      maxPoints: component.maxPoints,
      weight: component.weight,
      date: gradeDetails[component.code]?.date ?? null,
      comment: gradeDetails[component.code]?.comment ?? null,
      currentContribution:
        currentRawContribution === null
          ? null
          : roundToHundredths(currentRawContribution),
      forecastContribution:
        forecastRawContribution === null
          ? null
          : roundToHundredths(forecastRawContribution),
    };
  });

  const remainingComponents = formula.components
    .filter(
      (component) =>
        !Object.prototype.hasOwnProperty.call(
          receivedScores,
          component.code,
        ),
    )
    .map((component) => ({
      code: component.code,
      name: component.name,
      maxPoints: component.maxPoints,
      weight: component.weight,
    }));

  return {
    components,
    accumulatedContribution: roundToHundredths(accumulatedContribution),
    remainingComponents,
    remainingMaximumPoints,
    remainingWeight,
    currentCalculation,
    forecastCalculation,
    forecastComplete: forecastCalculation.missingComponents.length === 0,
    officialResult,
    minimumScores: remainingComponents.flatMap((component) =>
      ([3, 4, 5] as const).map((grade) => ({
        componentCode: component.code,
        grade,
        score: findMinimumScoreForGrade(
          formula,
          receivedScores,
          component.code,
          grade,
        ),
      })),
    ),
  };
}

function findMinimumScoreForGrade(
  formula: GradeFormula,
  receivedScores: Readonly<Record<string, number>>,
  targetCode: string,
  targetGrade: 3 | 4 | 5,
): number | null {
  const target = formula.components.find(
    (component) => component.code === targetCode,
  );
  if (!target) {
    throw new RangeError(`Неизвестный компонент оценки: "${targetCode}".`);
  }

  const baseScores: Record<string, number> = { ...receivedScores };
  for (const component of formula.components) {
    if (
      component.code !== targetCode &&
      !Object.prototype.hasOwnProperty.call(receivedScores, component.code)
    ) {
      baseScores[component.code] = 0;
    }
  }

  const maximumHundredths = Math.floor(
    (target.maxPoints + Number.EPSILON) * 100,
  );
  let low = 0;
  let high = maximumHundredths;
  let minimum: number | null = null;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const score = middle / 100;
    const result = calculateGrade(formula, {
      ...baseScores,
      [targetCode]: score,
    });

    if (result.grade !== null && result.grade >= targetGrade) {
      minimum = score;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  return minimum;
}

function roundToHundredths(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

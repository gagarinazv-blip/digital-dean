export type GradeFormulaComponent = {
  code: string;
  name: string;
  weight: number;
  maxPoints: number;
  order: number;
  requiredForFinal: boolean;
};

export type GradeFormulaSource = "PUBLISHED" | "DEMONSTRATION";

export type GradeScaleBand = {
  minimumPoints: number;
  maximumPoints: number;
  grade: 2 | 3 | 4 | 5;
  passed: boolean;
};

export type GradeFormula = {
  subjectId: string;
  semesterCode: string;
  subjectName: string;
  source: GradeFormulaSource;
  roundingMode: "HALF_UP_TO_INTEGER";
  components: readonly GradeFormulaComponent[];
  scale: readonly GradeScaleBand[];
  sourceNote: string;
};

export type GradeCalculation = {
  totalPoints: number;
  grade: 2 | 3 | 4 | 5 | null;
  passed: boolean | null;
  missingComponents: string[];
  notes: string[];
};

export const standardGradeScale = [
  { minimumPoints: 0, maximumPoints: 54, grade: 2, passed: false },
  { minimumPoints: 55, maximumPoints: 74, grade: 3, passed: true },
  { minimumPoints: 75, maximumPoints: 89, grade: 4, passed: true },
  { minimumPoints: 90, maximumPoints: 100, grade: 5, passed: true },
] as const satisfies readonly GradeScaleBand[];

export const computerNetworksFormula = {
  subjectId: "pi31-s5-networks",
  semesterCode: "2026-2027-1",
  subjectName: "Компьютерные сети",
  source: "DEMONSTRATION",
  roundingMode: "HALF_UP_TO_INTEGER",
  components: [
    {
      code: "midterm-1",
      name: "Контрольная работа 1",
      weight: 20,
      maxPoints: 20,
      order: 1,
      requiredForFinal: false,
    },
    {
      code: "midterm-2",
      name: "Контрольная работа 2",
      weight: 20,
      maxPoints: 20,
      order: 2,
      requiredForFinal: false,
    },
    {
      code: "labs",
      name: "Лабораторные работы",
      weight: 30,
      maxPoints: 30,
      order: 3,
      requiredForFinal: false,
    },
    {
      code: "activity",
      name: "Посещаемость и активность",
      weight: 10,
      maxPoints: 10,
      order: 4,
      requiredForFinal: false,
    },
    {
      code: "exam",
      name: "Экзамен",
      weight: 20,
      maxPoints: 20,
      order: 5,
      requiredForFinal: true,
    },
  ],
  scale: standardGradeScale,
  sourceNote:
    "Демонстрационная формула. Она нужна для показа расчёта и не является опубликованной методикой университета.",
} as const satisfies GradeFormula;

export const algorithmsFormula = {
  subjectId: "pi31-s5-algorithms",
  semesterCode: "2026-2027-1",
  subjectName: "Алгоритмы анализа данных",
  source: "DEMONSTRATION",
  roundingMode: "HALF_UP_TO_INTEGER",
  components: [
    {
      code: "midterm-1",
      name: "Контрольная работа",
      weight: 20,
      maxPoints: 20,
      order: 1,
      requiredForFinal: false,
    },
    {
      code: "labs",
      name: "Лабораторные работы",
      weight: 30,
      maxPoints: 30,
      order: 2,
      requiredForFinal: false,
    },
    {
      code: "project",
      name: "Проект",
      weight: 30,
      maxPoints: 30,
      order: 3,
      requiredForFinal: false,
    },
    {
      code: "exam",
      name: "Экзамен",
      weight: 20,
      maxPoints: 20,
      order: 4,
      requiredForFinal: true,
    },
  ],
  scale: standardGradeScale,
  sourceNote:
    "Демонстрационная формула. Она нужна для показа расчёта и не является опубликованной методикой университета.",
} as const satisfies GradeFormula;

export const databasesFormula = {
  subjectId: "pi31-s5-databases",
  semesterCode: "2026-2027-1",
  subjectName: "Проектирование баз данных",
  source: "DEMONSTRATION",
  roundingMode: "HALF_UP_TO_INTEGER",
  components: [
    {
      code: "midterm-1",
      name: "Контрольная работа",
      weight: 20,
      maxPoints: 20,
      order: 1,
      requiredForFinal: false,
    },
    {
      code: "labs",
      name: "Лабораторные работы",
      weight: 35,
      maxPoints: 35,
      order: 2,
      requiredForFinal: false,
    },
    {
      code: "project",
      name: "Проект базы данных",
      weight: 25,
      maxPoints: 25,
      order: 3,
      requiredForFinal: false,
    },
    {
      code: "exam",
      name: "Защита проекта",
      weight: 20,
      maxPoints: 20,
      order: 4,
      requiredForFinal: true,
    },
  ],
  scale: standardGradeScale,
  sourceNote:
    "Демонстрационная формула. Она нужна для показа расчёта и не является опубликованной методикой университета.",
} as const satisfies GradeFormula;

export const distributedApplicationsFormula = {
  subjectId: "pi31-s5-distributed",
  semesterCode: "2026-2027-1",
  subjectName: "Распределённые приложения",
  source: "DEMONSTRATION",
  roundingMode: "HALF_UP_TO_INTEGER",
  components: [
    {
      code: "midterm-1",
      name: "Контрольная работа 1",
      weight: 20,
      maxPoints: 20,
      order: 1,
      requiredForFinal: false,
    },
    {
      code: "midterm-2",
      name: "Контрольная работа 2",
      weight: 20,
      maxPoints: 20,
      order: 2,
      requiredForFinal: false,
    },
    {
      code: "labs",
      name: "Лабораторные работы",
      weight: 30,
      maxPoints: 30,
      order: 3,
      requiredForFinal: false,
    },
    {
      code: "activity",
      name: "Посещаемость и активность",
      weight: 10,
      maxPoints: 10,
      order: 4,
      requiredForFinal: false,
    },
    {
      code: "exam",
      name: "Экзамен",
      weight: 20,
      maxPoints: 20,
      order: 5,
      requiredForFinal: true,
    },
  ],
  scale: standardGradeScale,
  sourceNote:
    "Демонстрационная формула. Она нужна для показа расчёта и не является опубликованной методикой университета.",
} as const satisfies GradeFormula;

export const gradeFormulas = [
  computerNetworksFormula,
  algorithmsFormula,
  databasesFormula,
  distributedApplicationsFormula,
] as const satisfies readonly GradeFormula[];

export function calculateGrade(
  formula: GradeFormula,
  scores: Readonly<Record<string, number | undefined>> = {},
): GradeCalculation {
  validateGradeFormula(formula);
  validateScores(formula, scores);

  const missingComponents: string[] = [];
  let weightedTotal = 0;

  for (const component of formula.components) {
    const hasOverride = Object.prototype.hasOwnProperty.call(
      scores,
      component.code,
    );
    const score = hasOverride ? scores[component.code] : undefined;

    if (score === undefined) {
      missingComponents.push(component.code);
      continue;
    }

    weightedTotal += (score / component.maxPoints) * component.weight;
  }

  // Compensate only for one-ULP drift at a half-up boundary.
  const roundingTolerance =
    Number.EPSILON * Math.max(1, Math.abs(weightedTotal));
  const totalPoints = Math.floor(weightedTotal + 0.5 + roundingTolerance);
  const notes: string[] = [];
  const missingRequired = formula.components.filter(
    (component) =>
      component.requiredForFinal &&
      missingComponents.includes(component.code),
  );

  if (missingComponents.length > 0) {
    notes.push(
      `Не получены компоненты: ${missingComponents.join(", ")}. Итоговая оценка пока не рассчитана.`,
    );
  }
  if (missingRequired.length > 0) {
    notes.push(
      `Для итоговой оценки обязателен компонент: ${missingRequired.map((component) => component.name).join(", ")}.`,
    );
  }

  if (missingComponents.length > 0) {
    return {
      totalPoints,
      grade: null,
      passed: null,
      missingComponents,
      notes,
    };
  }

  const band = formula.scale.find(
    (entry) =>
      totalPoints >= entry.minimumPoints &&
      totalPoints <= entry.maximumPoints,
  );

  if (!band) {
    throw new Error(`Для результата ${totalPoints} не задана шкала оценки.`);
  }
  if (!band.passed) {
    notes.push("Итоговый результат ниже порога зачёта.");
  }

  return {
    totalPoints,
    grade: band.grade,
    passed: band.passed,
    missingComponents,
    notes,
  };
}

export function validateGradeFormula(formula: GradeFormula): void {
  if (
    !formula ||
    !formula.subjectId ||
    !formula.semesterCode ||
    !formula.subjectName ||
    !formula.sourceNote ||
    !["PUBLISHED", "DEMONSTRATION"].includes(formula.source) ||
    formula.roundingMode !== "HALF_UP_TO_INTEGER" ||
    !Array.isArray(formula.components) ||
    !formula.components.length
  ) {
    throw new TypeError("Формула должна содержать хотя бы один компонент.");
  }

  const componentCodes = new Set<string>();
  const componentOrders = new Set<number>();
  let weightTotal = 0;

  for (const component of formula.components) {
    if (!component.code || componentCodes.has(component.code)) {
      throw new TypeError(
        `Пустой или повторяющийся код компонента: "${component.code}".`,
      );
    }
    componentCodes.add(component.code);

    if (
      !component.name ||
      !Number.isFinite(component.weight) ||
      component.weight < 0 ||
      !Number.isFinite(component.maxPoints) ||
      component.maxPoints <= 0 ||
      !Number.isInteger(component.order) ||
      component.order < 1 ||
      componentOrders.has(component.order) ||
      typeof component.requiredForFinal !== "boolean"
    ) {
      throw new RangeError(
        `Некорректный вес, максимум или порядок компонента "${component.code}".`,
      );
    }
    componentOrders.add(component.order);
    weightTotal += component.weight;
  }

  if (weightTotal !== 100) {
    throw new RangeError(
      `Сумма весов компонентов должна быть ровно 100% (получено ${weightTotal}%).`,
    );
  }

  if (!Array.isArray(formula.scale) || !formula.scale.length) {
    throw new TypeError("Формула должна содержать шкалу оценок.");
  }

  let nextMinimum = 0;
  for (const band of formula.scale) {
    if (
      !Number.isInteger(band.minimumPoints) ||
      !Number.isInteger(band.maximumPoints) ||
      band.minimumPoints !== nextMinimum ||
      band.maximumPoints < band.minimumPoints ||
      band.maximumPoints > 100
    ) {
      throw new RangeError("Шкала должна без пропусков покрывать баллы от 0 до 100.");
    }
    nextMinimum = band.maximumPoints + 1;
  }
  if (nextMinimum !== 101) {
    throw new RangeError("Шкала должна без пропусков покрывать баллы от 0 до 100.");
  }
}

function validateScores(
  formula: GradeFormula,
  scores: Readonly<Record<string, number | undefined>>,
): void {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) {
    throw new TypeError(
      "Оценки должны быть объектом с кодами компонентов и баллами.",
    );
  }

  const componentsByCode = new Map(
    formula.components.map((component) => [component.code, component]),
  );

  for (const code of Object.keys(scores)) {
    const component = componentsByCode.get(code);
    if (!component) {
      throw new RangeError(`Неизвестный компонент оценки: "${code}".`);
    }

    const score = scores[code];
    if (score !== undefined) {
      validateScore(component, score);
    }
  }
}

function validateScore(
  component: GradeFormulaComponent,
  score: number,
): void {
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > component.maxPoints
  ) {
    throw new RangeError(
      `Баллы компонента "${component.code}" должны быть числом от 0 до ${component.maxPoints}.`,
    );
  }
}

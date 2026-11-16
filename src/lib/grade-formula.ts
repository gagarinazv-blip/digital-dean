export type GradeComponentStatus = "RECEIVED" | "NOT_RECEIVED";

export type GradeFormulaComponent = {
  id: string;
  name: string;
  weight: number;
  maxPoints: number;
  status: GradeComponentStatus;
  baselineScore?: number;
  requiredForFinal: boolean;
};

export type GradeScaleBand = {
  minimumPoints: number;
  maximumPoints: number;
  grade: 2 | 3 | 4 | 5;
  passed: boolean;
};

export type GradeFormula = {
  subjectId: string;
  subjectName: string;
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

export const computerNetworksFormula = {
  subjectId: "pi31-s5-networks",
  subjectName: "Компьютерные сети",
  roundingMode: "HALF_UP_TO_INTEGER",
  components: [
    {
      id: "midterm-1",
      name: "Контрольная работа 1",
      weight: 20,
      maxPoints: 20,
      status: "RECEIVED",
      baselineScore: 18,
      requiredForFinal: false,
    },
    {
      id: "midterm-2",
      name: "Контрольная работа 2",
      weight: 20,
      maxPoints: 20,
      status: "RECEIVED",
      baselineScore: 18,
      requiredForFinal: false,
    },
    {
      id: "labs",
      name: "Лабораторные работы",
      weight: 30,
      maxPoints: 30,
      status: "RECEIVED",
      baselineScore: 27,
      requiredForFinal: false,
    },
    {
      id: "activity",
      name: "Посещаемость и активность",
      weight: 10,
      maxPoints: 10,
      status: "RECEIVED",
      baselineScore: 9,
      requiredForFinal: false,
    },
    {
      id: "exam",
      name: "Экзамен",
      weight: 20,
      maxPoints: 20,
      status: "NOT_RECEIVED",
      requiredForFinal: true,
    },
  ],
  scale: [
    { minimumPoints: 0, maximumPoints: 54, grade: 2, passed: false },
    { minimumPoints: 55, maximumPoints: 74, grade: 3, passed: true },
    { minimumPoints: 75, maximumPoints: 89, grade: 4, passed: true },
    { minimumPoints: 90, maximumPoints: 100, grade: 5, passed: true },
  ],
  sourceNote:
    "Баллы компонентов приведены только для демонстрации формулы; фикстура хранит итоговые оценки, но не баллы контрольных и лабораторных.",
} as const satisfies GradeFormula;

export function calculateGrade(
  formula: GradeFormula,
  scores: Readonly<Record<string, number | undefined>> = {},
): GradeCalculation {
  validateFormula(formula);
  validateScores(formula, scores);

  const missingComponents: string[] = [];
  let weightedTotal = 0;

  for (const component of formula.components) {
    const hasOverride = Object.prototype.hasOwnProperty.call(
      scores,
      component.id,
    );
    const score = hasOverride ? scores[component.id] : component.baselineScore;

    if (score === undefined) {
      missingComponents.push(component.id);
      continue;
    }

    weightedTotal += (score / component.maxPoints) * component.weight;
  }

  const totalPoints = Math.floor(weightedTotal + 0.5);
  const notes: string[] = [];
  const missingRequired = formula.components.filter(
    (component) =>
      component.requiredForFinal &&
      missingComponents.includes(component.id),
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

function validateFormula(formula: GradeFormula): void {
  if (!formula || !Array.isArray(formula.components) || !formula.components.length) {
    throw new TypeError("Формула должна содержать хотя бы один компонент.");
  }

  const componentIds = new Set<string>();
  let weightTotal = 0;

  for (const component of formula.components) {
    if (!component.id || componentIds.has(component.id)) {
      throw new TypeError(`Пустой или повторяющийся id компонента: "${component.id}".`);
    }
    componentIds.add(component.id);

    if (
      !Number.isFinite(component.weight) ||
      component.weight < 0 ||
      !Number.isFinite(component.maxPoints) ||
      component.maxPoints <= 0
    ) {
      throw new RangeError(
        `Некорректный вес или максимум баллов компонента "${component.id}".`,
      );
    }
    weightTotal += component.weight;

    if (component.status === "RECEIVED") {
      if (component.baselineScore === undefined) {
        throw new TypeError(
          `Для полученного компонента "${component.id}" не указаны баллы.`,
        );
      }
      validateScore(component, component.baselineScore);
    } else if (
      component.status !== "NOT_RECEIVED" ||
      component.baselineScore !== undefined
    ) {
      throw new TypeError(
        `Статус и исходные баллы компонента "${component.id}" не согласованы.`,
      );
    }
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
    throw new TypeError("Оценки должны быть объектом с id компонентов и баллами.");
  }

  const componentsById = new Map(
    formula.components.map((component) => [component.id, component]),
  );

  for (const id of Object.keys(scores)) {
    const component = componentsById.get(id);
    if (!component) {
      throw new RangeError(`Неизвестный компонент оценки: "${id}".`);
    }

    const score = scores[id];
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
      `Баллы компонента "${component.id}" должны быть числом от 0 до ${component.maxPoints}.`,
    );
  }
}

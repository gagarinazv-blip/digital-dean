import {
  calculateGrade,
  type GradeFormula,
} from "@/lib/grade-formula";

export type ParsedGradeInput =
  | { kind: "empty" }
  | { kind: "valid"; score: number }
  | { kind: "invalid"; message: string };

export type PreparedGradeInputs = {
  scores: Record<string, number | undefined>;
  hypotheses: Record<string, number>;
  errors: Record<string, string>;
};

export function parseGradeInput(
  input: string,
  maximum: number,
): ParsedGradeInput {
  if (!Number.isFinite(maximum) || maximum <= 0) {
    throw new RangeError("Максимум баллов должен быть положительным числом.");
  }

  const value = input.trim();
  if (!value) {
    return { kind: "empty" };
  }

  if (value.startsWith("-") || value.startsWith("−")) {
    return {
      kind: "invalid",
      message: "Баллы не могут быть отрицательными.",
    };
  }

  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value)) {
    return {
      kind: "invalid",
      message: "Введите число, используя цифры и одну запятую или точку.",
    };
  }

  const score = Number(value.replace(",", "."));
  if (!Number.isFinite(score)) {
    return { kind: "invalid", message: "Введите корректное число баллов." };
  }
  if (score > maximum) {
    return {
      kind: "invalid",
      message: `Максимум за компонент — ${maximum} баллов.`,
    };
  }

  return { kind: "valid", score };
}

export function prepareGradeInputs(
  formula: GradeFormula,
  receivedScores: Readonly<Record<string, number>>,
  values: Readonly<Record<string, string>>,
): PreparedGradeInputs {
  calculateGrade(formula, receivedScores);
  const scores: Record<string, number | undefined> = {
    ...receivedScores,
  };
  const hypotheses: Record<string, number> = {};
  const errors: Record<string, string> = {};

  for (const component of formula.components) {
    if (Object.prototype.hasOwnProperty.call(receivedScores, component.code)) {
      continue;
    }

    const parsed = parseGradeInput(values[component.code] ?? "", component.maxPoints);
    if (parsed.kind === "valid") {
      scores[component.code] = parsed.score;
      hypotheses[component.code] = parsed.score;
    } else {
      scores[component.code] = undefined;
      if (parsed.kind === "invalid") {
        errors[component.code] = parsed.message;
      }
    }
  }

  return { scores, hypotheses, errors };
}

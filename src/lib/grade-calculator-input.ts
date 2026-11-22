import {
  calculateGrade,
  type GradeFormula,
} from "@/lib/grade-formula";

export type ParsedGradeInput =
  | { kind: "empty" }
  | { kind: "valid"; score: number }
  | { kind: "invalid"; message: string };

export type PreparedGradeInputs = {
  /** Полученные баллы, которые студент не заменил предположением. */
  facts: Record<string, number>;
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

/**
 * Делит баллы на факты и предположения. Предположить можно любой компонент:
 * введённое значение действует вместо полученного только внутри калькулятора.
 */
export function prepareGradeInputs(
  formula: GradeFormula,
  receivedScores: Readonly<Record<string, number>>,
  values: Readonly<Record<string, string>>,
): PreparedGradeInputs {
  calculateGrade(formula, receivedScores);
  const facts: Record<string, number> = {};
  const hypotheses: Record<string, number> = {};
  const errors: Record<string, string> = {};

  for (const { code, maxPoints } of formula.components) {
    const received = Object.prototype.hasOwnProperty.call(receivedScores, code)
      ? receivedScores[code]
      : undefined;
    const parsed = parseGradeInput(values[code] ?? "", maxPoints);
    if (parsed.kind === "invalid") errors[code] = parsed.message;

    if (parsed.kind === "valid" && parsed.score !== received) {
      hypotheses[code] = parsed.score;
    } else if (received !== undefined) {
      // Пустое, ошибочное или совпавшее значение возвращает полученный балл.
      facts[code] = received;
    }
  }

  return { facts, hypotheses, errors };
}

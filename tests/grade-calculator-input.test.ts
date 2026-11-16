import { describe, expect, it } from "vitest";
import {
  parseGradeInput,
  prepareGradeInputs,
} from "../src/lib/grade-calculator-input";
import {
  calculateGrade,
  computerNetworksFormula,
  type GradeFormula,
} from "../src/lib/grade-formula";

describe("grade calculator input", () => {
  it("parses decimal commas and points", () => {
    expect(parseGradeInput("12,5", 20)).toEqual({
      kind: "valid",
      score: 12.5,
    });
    expect(parseGradeInput("12.5", 20)).toEqual({
      kind: "valid",
      score: 12.5,
    });
  });

  it("treats an empty value as not entered", () => {
    expect(parseGradeInput("  ", 20)).toEqual({ kind: "empty" });
  });

  it("rejects letters and negative numbers", () => {
    expect(parseGradeInput("abc", 20)).toMatchObject({ kind: "invalid" });
    expect(parseGradeInput("-1", 20)).toEqual({
      kind: "invalid",
      message: "Баллы не могут быть отрицательными.",
    });
  });

  it("accepts inclusive component boundaries and rejects values above the maximum", () => {
    expect(parseGradeInput("0", 20)).toEqual({ kind: "valid", score: 0 });
    expect(parseGradeInput("20", 20)).toEqual({ kind: "valid", score: 20 });
    expect(parseGradeInput("20.01", 20)).toMatchObject({
      kind: "invalid",
      message: "Максимум за компонент — 20 баллов.",
    });
  });

  it("rounds a 74.5 hypothesis to 75 and moves it to grade 4", () => {
    const { scores, errors } = prepareGradeInputs(computerNetworksFormula, {
      exam: "2,5",
    });
    const result = calculateGrade(computerNetworksFormula, scores);

    expect(errors).toEqual({});
    expect(result).toMatchObject({
      totalPoints: 75,
      grade: 4,
      passed: true,
    });
  });

  it("keeps a field error out of calculation while passing other hypothetical values", () => {
    const formula = formulaWithTwoPendingComponents();
    const { scores, errors } = prepareGradeInputs(formula, {
      exam: "21",
      project: "5",
    });
    const result = calculateGrade(formula, scores);

    expect(errors).toEqual({
      exam: "Максимум за компонент — 20 баллов.",
    });
    expect(scores).toMatchObject({ exam: undefined, project: 5 });
    expect(result).toMatchObject({
      grade: null,
      passed: null,
      missingComponents: ["exam"],
    });
  });
});

function formulaWithTwoPendingComponents(): GradeFormula {
  const components = computerNetworksFormula.components.map((component) => {
    if (component.id === "exam") {
      return { ...component, weight: 10 };
    }
    return component;
  });

  return {
    ...computerNetworksFormula,
    components: [
      ...components,
      {
        id: "project",
        name: "Мини-проект",
        weight: 10,
        maxPoints: 10,
        status: "NOT_RECEIVED",
        requiredForFinal: false,
      },
    ],
  };
}

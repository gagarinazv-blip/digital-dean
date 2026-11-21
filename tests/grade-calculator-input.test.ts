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

  it("keeps received scores fixed and uses only missing-component inputs as hypotheses", () => {
    const actualScores = Object.freeze({
      "midterm-1": 19,
      "midterm-2": 18,
      labs: 28,
      activity: 9,
    });
    const prepared = prepareGradeInputs(computerNetworksFormula, actualScores, {
      "midterm-1": "0",
      exam: "2,5",
    });

    expect(prepared.errors).toEqual({});
    expect(prepared.hypotheses).toEqual({ exam: 2.5 });
    expect(prepared.scores).toMatchObject({
      "midterm-1": 19,
      "midterm-2": 18,
      labs: 28,
      activity: 9,
      exam: 2.5,
    });
    expect(calculateGrade(computerNetworksFormula, prepared.scores)).toMatchObject({
      totalPoints: 77,
      grade: 4,
      passed: true,
    });
    expect(actualScores["midterm-1"]).toBe(19);
  });

  it("leaves blank hypotheses empty instead of filling baseline scores", () => {
    const prepared = prepareGradeInputs(computerNetworksFormula, {}, {});

    expect(prepared).toEqual({
      scores: {
        "midterm-1": undefined,
        "midterm-2": undefined,
        labs: undefined,
        activity: undefined,
        exam: undefined,
      },
      hypotheses: {},
      errors: {},
    });
  });

  it("excludes invalid hypotheses but keeps other valid hypotheses", () => {
    const formula = formulaWithTwoPendingComponents();
    const actualScores = {
      "midterm-1": 19,
      "midterm-2": 18,
      labs: 28,
      activity: 9,
    };
    const prepared = prepareGradeInputs(formula, actualScores, {
      exam: "21",
      project: "5",
    });
    const result = calculateGrade(formula, prepared.scores);

    expect(prepared.errors).toEqual({
      exam: "Максимум за компонент — 20 баллов.",
    });
    expect(prepared.hypotheses).toEqual({ project: 5 });
    expect(prepared.scores).toMatchObject({
      "midterm-1": 19,
      "midterm-2": 18,
      labs: 28,
      activity: 9,
      exam: undefined,
      project: 5,
    });
    expect(result).toMatchObject({
      grade: null,
      passed: null,
      missingComponents: ["exam"],
    });
  });
});

function formulaWithTwoPendingComponents(): GradeFormula {
  const components = computerNetworksFormula.components.map((component) =>
    component.code === "exam" ? { ...component, weight: 10 } : component,
  );

  return {
    ...computerNetworksFormula,
    components: [
      ...components,
      {
        code: "project",
        name: "Мини-проект",
        weight: 10,
        maxPoints: 10,
        order: 6,
        requiredForFinal: false,
      },
    ],
  };
}

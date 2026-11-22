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

  it("lets a hypothesis replace any score without touching the received ones", () => {
    const actualScores = Object.freeze({
      "midterm-1": 19,
      "midterm-2": 18,
      labs: 28,
      activity: 9,
    });
    const prepared = prepareGradeInputs(computerNetworksFormula, actualScores, {
      "midterm-1": "10",
      exam: "2,5",
    });

    expect(prepared).toEqual({
      facts: { "midterm-2": 18, labs: 28, activity: 9 },
      hypotheses: { "midterm-1": 10, exam: 2.5 },
      errors: {},
    });
    expect(
      calculateGrade(computerNetworksFormula, {
        ...prepared.facts,
        ...prepared.hypotheses,
      }),
    ).toMatchObject({ totalPoints: 68, grade: 3, passed: true });
    expect(actualScores["midterm-1"]).toBe(19);
  });

  it("returns to the fact when the hypothesis is cleared, equal or invalid", () => {
    const received = { labs: 28 };
    for (const value of ["", "  ", "28", "28,0", "31", "abc"]) {
      const prepared = prepareGradeInputs(computerNetworksFormula, received, {
        labs: value,
      });
      expect(prepared.facts).toEqual({ labs: 28 });
      expect(prepared.hypotheses).toEqual({});
    }
    expect(
      prepareGradeInputs(computerNetworksFormula, received, { labs: "31" }).errors,
    ).toEqual({ labs: "Максимум за компонент — 30 баллов." });
  });

  it("leaves blank hypotheses empty instead of filling baseline scores", () => {
    expect(prepareGradeInputs(computerNetworksFormula, {}, {})).toEqual({
      facts: {},
      hypotheses: {},
      errors: {},
    });
  });

  it("excludes invalid hypotheses but keeps other valid hypotheses", () => {
    const prepared = prepareGradeInputs(
      formulaWithTwoPendingComponents(),
      { "midterm-1": 19, "midterm-2": 18, labs: 28, activity: 9 },
      { exam: "21", project: "5" },
    );

    expect(prepared.errors).toEqual({
      exam: "Максимум за компонент — 20 баллов.",
    });
    expect(prepared.hypotheses).toEqual({ project: 5 });
    expect(prepared.facts).not.toHaveProperty("exam");
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

import { describe, expect, it } from "vitest";
import { getForecastRange, planForTarget } from "../src/lib/grade-forecast";
import {
  calculateGrade,
  computerNetworksFormula,
  validateGradeFormula,
} from "../src/lib/grade-formula";
import { getTypicalFormula } from "../src/lib/typical-formula";

const formula = computerNetworksFormula;
const received = { "midterm-1": 19, "midterm-2": 18, labs: 28, activity: 9 };

describe("forecast range", () => {
  it("spans from zeros to maximums for the unknown components", () => {
    expect(getForecastRange(formula, received)).toEqual({ minimum: 74, maximum: 94 });
    expect(getForecastRange(formula, {})).toEqual({ minimum: 0, maximum: 100 });
    expect(getForecastRange(formula, { ...received, exam: 10 })).toEqual({ minimum: 84, maximum: 84 });
  });
});

describe("target plan", () => {
  it("finds the smallest sufficient scores", () => {
    const plan = planForTarget(formula, received, ["exam"], 5);
    if (plan.kind !== "plan") throw new Error("Plan expected.");
    expect(calculateGrade(formula, { ...received, ...plan.scores }).grade).toBe(5);
    // На 0,2 балла меньше пятёрки уже нет: порог 90 с округлением от 89,5.
    expect(calculateGrade(formula, { ...received, exam: plan.scores.exam - 0.2 }).grade).toBe(4);
  });

  it("knows when the grade is already reached or out of reach", () => {
    expect(planForTarget(formula, received, ["exam"], 3)).toEqual({ kind: "reached" });
    expect(planForTarget(formula, { ...received, labs: 5 }, ["exam"], 5)).toEqual({
      kind: "impossible",
      maximum: 71,
    });
  });

  it("works when every score is already set or nothing is", () => {
    const complete = { ...received, exam: 20 };
    expect(planForTarget(formula, complete, [], 5)).toEqual({ kind: "reached" });
    expect(planForTarget(formula, { ...complete, exam: 5 }, [], 5)).toMatchObject({ kind: "impossible" });

    const codes = formula.components.map(({ code }) => code);
    const plan = planForTarget(formula, {}, codes, 3);
    if (plan.kind !== "plan") throw new Error("Plan expected.");
    expect(Object.keys(plan.scores)).toEqual(codes);
    expect(calculateGrade(formula, plan.scores).grade).toBe(3);
    for (const component of formula.components) {
      expect(plan.scores[component.code]).toBeLessThanOrEqual(component.maxPoints);
    }
  });

  it("keeps a hypothesis in place of a received score", () => {
    const worse = planForTarget(formula, { ...received, labs: 20 }, ["exam"], 4);
    const better = planForTarget(formula, received, ["exam"], 4);
    if (worse.kind !== "plan" || better.kind !== "plan") throw new Error("Plan expected.");
    expect(worse.scores.exam).toBeGreaterThan(better.scores.exam);
  });
});

describe("typical formula", () => {
  it.each(["EXAM", "CREDIT", "DIFFERENTIATED_CREDIT", "COURSEWORK", "OTHER"] as const)(
    "is valid for %s",
    (controlType) => {
      const typical = getTypicalFormula({
        id: "subject",
        name: "Дисциплина",
        controlType,
        semesterCode: "2026-2027-1",
      });
      expect(() => validateGradeFormula(typical)).not.toThrow();
      expect(typical.source).toBe("TYPICAL");
      expect(typical.components.some(({ requiredForFinal }) => requiredForFinal)).toBe(true);
    },
  );
});

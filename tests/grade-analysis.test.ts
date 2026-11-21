import { describe, expect, it } from "vitest";
import { analyzeGrade } from "../src/lib/grade-analysis";
import {
  computerNetworksFormula,
  type GradeFormula,
} from "../src/lib/grade-formula";
import { getGradebookEntry } from "../src/lib/gradebook-data";

describe("grade analysis", () => {
  it("separates current contribution, ungraded work, forecast, and official result", () => {
    const entry = getGradebookEntry(
      "student.alpha",
      "2026-2027-1",
      computerNetworksFormula.subjectId,
    );
    if (!entry) throw new Error("Computer networks formula is missing.");

    const analysis = analyzeGrade(
      entry.formula,
      entry.scores,
      {},
      null,
      entry.components,
    );

    expect(analysis.accumulatedContribution).toBe(74);
    expect(analysis.currentCalculation).toMatchObject({
      totalPoints: 74,
      grade: null,
      passed: null,
      missingComponents: ["exam"],
    });
    expect(analysis.remainingComponents).toEqual([
      {
        code: "exam",
        name: "Экзамен",
        maxPoints: 20,
        weight: 20,
      },
    ]);
    expect(analysis.remainingMaximumPoints).toBe(20);
    expect(analysis.remainingWeight).toBe(20);
    expect(analysis.components.find((item) => item.code === "exam")).toMatchObject({
      status: "NOT_RECEIVED",
      score: null,
      currentContribution: null,
    });
    expect(analysis.officialResult).toBeNull();
  });

  it("applies hypotheses only to missing components and leaves official result unchanged", () => {
    const entry = getGradebookEntry(
      "student.alpha",
      "2026-2027-1",
      computerNetworksFormula.subjectId,
    );
    if (!entry) throw new Error("Computer networks formula is missing.");

    const actualScores = Object.freeze({ ...entry.scores });
    const analysis = analyzeGrade(
      entry.formula,
      actualScores,
      { exam: 17 },
      null,
      entry.components,
    );

    expect(analysis.forecastCalculation).toMatchObject({
      totalPoints: 91,
      grade: 5,
      passed: true,
      missingComponents: [],
    });
    expect(analysis.forecastComplete).toBe(true);
    expect(analysis.officialResult).toBeNull();
    expect(actualScores).toEqual(entry.scores);
    expect(() =>
      analyzeGrade(entry.formula, actualScores, { labs: 10 }),
    ).toThrow('Нельзя задать гипотезу для уже оценённого компонента "labs".');
  });

  it("rounds displayed contributions to hundredths without accumulating binary noise", () => {
    const formula = formulaWithTwoComponents();
    const analysis = analyzeGrade(formula, { first: 0.2, second: 0.4 });

    expect(analysis.components.map((item) => item.currentContribution)).toEqual([
      0.1,
      0.2,
    ]);
    expect(analysis.accumulatedContribution).toBe(0.3);
  });

  it("reports unreachable target grades instead of inventing a required score", () => {
    const formula: GradeFormula = {
      ...computerNetworksFormula,
      components: [
        {
          code: "activity",
          name: "Активность",
          weight: 10,
          maxPoints: 10,
          order: 1,
          requiredForFinal: false,
        },
        {
          code: "exam",
          name: "Экзамен",
          weight: 90,
          maxPoints: 90,
          order: 2,
          requiredForFinal: true,
        },
      ],
    };
    const analysis = analyzeGrade(formula, {});

    expect(
      analysis.minimumScores.find(
        (item) => item.componentCode === "activity" && item.grade === 3,
      )?.score,
    ).toBeNull();
    expect(
      analysis.minimumScores.find(
        (item) => item.componentCode === "exam" && item.grade === 3,
      )?.score,
    ).not.toBeNull();
  });
});

function formulaWithTwoComponents(): GradeFormula {
  return {
    ...computerNetworksFormula,
    components: [
      {
        code: "first",
        name: "Первый компонент",
        weight: 50,
        maxPoints: 100,
        order: 1,
        requiredForFinal: false,
      },
      {
        code: "second",
        name: "Второй компонент",
        weight: 50,
        maxPoints: 100,
        order: 2,
        requiredForFinal: false,
      },
    ],
  };
}

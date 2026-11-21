import { describe, expect, it } from "vitest";
import { academicRecordsSeedData } from "../prisma/academic-records-seed-data";
import { analyzeGrade } from "../src/lib/grade-analysis";
import {
  getGradebookEntry,
  studentComponentGradeSeedData,
  validateGradebookSeedData,
} from "../src/lib/gradebook-data";

describe("student gradebook fixtures", () => {
  it("validates all formula weights and the separate student score rows", () => {
    expect(() =>
      validateGradebookSeedData(academicRecordsSeedData),
    ).not.toThrow();

    const keys = studentComponentGradeSeedData.map(
      ({ studentLogin, semesterCode, subjectId, componentCode }) =>
        [studentLogin, semesterCode, subjectId, componentCode].join(":"),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("calculates different contributions for the same component code per student", () => {
    const alpha = getGradebookEntry(
      "student.alpha",
      "2026-2027-1",
      "pi31-s5-networks",
    );
    const beta = getGradebookEntry(
      "student.beta",
      "2026-2027-1",
      "pi31-s5-distributed",
    );
    if (!alpha || !beta) throw new Error("A demo formula is missing.");

    const alphaAnalysis = analyzeGrade(alpha.formula, alpha.scores);
    const betaAnalysis = analyzeGrade(beta.formula, beta.scores);

    expect(alpha.formula.components.find((item) => item.code === "labs")).toMatchObject({
      weight: 30,
      maxPoints: 30,
    });
    expect(beta.formula.components.find((item) => item.code === "labs")).toMatchObject({
      weight: 30,
      maxPoints: 30,
    });
    expect(
      alphaAnalysis.components.find((item) => item.code === "labs")
        ?.currentContribution,
    ).toBe(28);
    expect(
      betaAnalysis.components.find((item) => item.code === "labs")
        ?.currentContribution,
    ).toBe(16);
  });

  it("returns no grade calculation when a discipline has no formula", () => {
    expect(
      getGradebookEntry(
        "student.alpha",
        "2026-2027-1",
        "pi31-s5-economics",
      ),
    ).toBeNull();
  });

  it("does not return another student's component scores", () => {
    const betaEntry = getGradebookEntry(
      "student.beta",
      "2026-2027-1",
      "pi31-s5-distributed",
    );
    const alphaEntryForBetaSubject = getGradebookEntry(
      "student.alpha",
      "2026-2027-1",
      "pi31-s5-distributed",
    );

    expect(betaEntry?.scores.labs).toBe(16);
    expect(alphaEntryForBetaSubject?.scores).toEqual({});
    expect(alphaEntryForBetaSubject?.components.labs.score).toBeNull();
  });
});

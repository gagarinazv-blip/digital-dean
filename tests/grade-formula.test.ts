import { describe, expect, it } from "vitest";
import { academicRecordsSeedData } from "../prisma/academic-records-seed-data";
import {
  calculateGrade,
  computerNetworksFormula,
  type GradeFormula,
} from "../src/lib/grade-formula";

describe("computer networks grade formula", () => {
  it("uses components whose weights total exactly 100%", () => {
    expect(
      computerNetworksFormula.components.reduce(
        (total, component) => total + component.weight,
        0,
      ),
    ).toBe(100);
    expect(
      computerNetworksFormula.components.find(
        (component) => component.id === "exam",
      ),
    ).toMatchObject({
      status: "NOT_RECEIVED",
      requiredForFinal: true,
    });
  });

  it.each([
    [0, 0, 2, false],
    [54.49, 54, 2, false],
    [54.5, 55, 3, true],
    [74.49, 74, 3, true],
    [74.5, 75, 4, true],
    [89.49, 89, 4, true],
    [89.5, 90, 5, true],
    [100, 100, 5, true],
  ])(
    "rounds %s to %s before applying the grade scale",
    (score, expectedTotal, expectedGrade, expectedPassed) => {
      const result = calculateGrade(makeSingleComponentFormula(), {
        result: score,
      });

      expect(result).toMatchObject({
        totalPoints: expectedTotal,
        grade: expectedGrade,
        passed: expectedPassed,
      });
    },
  );

  it("does not round component contributions before adding them", () => {
    const formula = {
      ...computerNetworksFormula,
      components: [
        {
          id: "first",
          name: "Первый компонент",
          weight: 50,
          maxPoints: 100,
          status: "NOT_RECEIVED",
          requiredForFinal: false,
        },
        {
          id: "second",
          name: "Второй компонент",
          weight: 50,
          maxPoints: 100,
          status: "NOT_RECEIVED",
          requiredForFinal: false,
        },
      ],
    } as const satisfies GradeFormula;

    expect(calculateGrade(formula, { first: 49, second: 49 })).toMatchObject({
      totalPoints: 49,
      grade: 2,
      passed: false,
    });
  });

  it("returns known weighted points but no final grade while components are missing", () => {
    const result = calculateGrade(computerNetworksFormula, { exam: undefined });

    expect(result).toMatchObject({
      totalPoints: 72,
      grade: null,
      passed: null,
      missingComponents: ["exam"],
    });
    expect(result.notes.join(" ")).toContain("обязателен компонент: Экзамен");
  });

  it("applies hypothetical exam scores without mutating the formula or inputs", () => {
    const scores = Object.freeze({ exam: 17 });
    const originalFormula = JSON.stringify(computerNetworksFormula);

    expect(calculateGrade(computerNetworksFormula, scores)).toMatchObject({
      totalPoints: 89,
      grade: 4,
      passed: true,
      missingComponents: [],
    });
    expect(JSON.stringify(computerNetworksFormula)).toBe(originalFormula);
    expect(scores).toEqual({ exam: 17 });
  });

  it("rejects unknown components and scores outside the component maximum", () => {
    expect(() =>
      calculateGrade(computerNetworksFormula, { surprise: 10 }),
    ).toThrow('Неизвестный компонент оценки: "surprise".');
    expect(() =>
      calculateGrade(computerNetworksFormula, { exam: -1 }),
    ).toThrow('Баллы компонента "exam" должны быть числом от 0 до 20.');
    expect(() =>
      calculateGrade(computerNetworksFormula, { exam: 20.1 }),
    ).toThrow('Баллы компонента "exam" должны быть числом от 0 до 20.');
  });

  it("rejects formulas whose component weights do not total 100%", () => {
    const formula = {
      ...computerNetworksFormula,
      components: computerNetworksFormula.components.map((component) =>
        component.id === "exam"
          ? { ...component, weight: 19 }
          : component,
      ),
    };

    expect(() => calculateGrade(formula)).toThrow(
      "Сумма весов компонентов должна быть ровно 100%",
    );
  });

  it("uses the fixture's planned exam course and its real study-load values", () => {
    const alpha = academicRecordsSeedData.students.find(
      (student) => student.login === "student.alpha",
    );
    const currentSemester = alpha?.semesters.find(
      (semester) => semester.isCurrent,
    );
    const subject = currentSemester?.subjects.find(
      (entry) => entry.id === computerNetworksFormula.subjectId,
    );
    const exam = alpha?.currentSemesterSchedule.find(
      (entry) => entry.subjectId === computerNetworksFormula.subjectId,
    );

    expect(subject).toMatchObject({
      name: computerNetworksFormula.subjectName,
      hours: 108,
      credits: 3,
      controlType: "EXAM",
    });
    expect(exam).toMatchObject({
      date: "2026-11-16",
      startTime: "09:00",
      endTime: "11:00",
      status: "PLANNED",
    });
    expect(
      currentSemester?.results.some(
        (result) => result.subjectId === computerNetworksFormula.subjectId,
      ),
    ).toBe(false);
    expect(calculateGrade(computerNetworksFormula, { exam: 18 })).toMatchObject({
      totalPoints: 90,
      grade: 5,
      passed: true,
    });
  });
});

function makeSingleComponentFormula(): GradeFormula {
  return {
    ...computerNetworksFormula,
    components: [
      {
        id: "result",
        name: "Итоговые баллы",
        weight: 100,
        maxPoints: 100,
        status: "NOT_RECEIVED",
        requiredForFinal: false,
      },
    ],
  };
}

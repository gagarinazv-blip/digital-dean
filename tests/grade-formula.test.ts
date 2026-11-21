import { describe, expect, it } from "vitest";
import { academicRecordsSeedData } from "../prisma/academic-records-seed-data";
import {
  calculateGrade,
  computerNetworksFormula,
  gradeFormulas,
  type GradeFormula,
} from "../src/lib/grade-formula";

describe("grade formulas", () => {
  it("keeps formulas separate from student component scores", () => {
    expect(
      gradeFormulas.map((formula) =>
        formula.components.reduce(
          (total, component) => total + component.weight,
          0,
        ),
      ),
    ).toEqual([100, 100, 100, 100]);

    for (const formula of gradeFormulas) {
      for (const component of formula.components) {
        expect(component).not.toHaveProperty("baselineScore");
        expect(component).not.toHaveProperty("status");
      }
    }

    expect(
      computerNetworksFormula.components.find(
        (component) => component.code === "exam",
      ),
    ).toMatchObject({
      requiredForFinal: true,
      weight: 20,
      maxPoints: 20,
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
    } as const satisfies GradeFormula;

    expect(calculateGrade(formula, { first: 49, second: 49 })).toMatchObject({
      totalPoints: 49,
      grade: 2,
      passed: false,
    });
  });

  it("rounds a mathematical half-point up when binary addition lands just below it", () => {
    const formula = {
      ...computerNetworksFormula,
      components: [
        {
          code: "first",
          name: "Первый компонент",
          weight: 10,
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
        {
          code: "third",
          name: "Третий компонент",
          weight: 40,
          maxPoints: 100,
          order: 3,
          requiredForFinal: false,
        },
      ],
    } as const satisfies GradeFormula;

    expect(
      calculateGrade(formula, {
        first: 3,
        second: 64.6,
        third: 54.75,
      }),
    ).toMatchObject({
      totalPoints: 55,
      grade: 3,
      passed: true,
    });
  });

  it("uses only supplied student scores and leaves missing work out of the result", () => {
    const scores = {
      "midterm-1": 19,
      "midterm-2": 18,
      labs: 28,
      activity: 9,
    };
    const result = calculateGrade(computerNetworksFormula, scores);

    expect(result).toMatchObject({
      totalPoints: 74,
      grade: null,
      passed: null,
      missingComponents: ["exam"],
    });
    expect(result.notes.join(" ")).toContain("обязателен компонент: Экзамен");
  });

  it("applies a hypothetical exam score without mutating the formula or inputs", () => {
    const scores = Object.freeze({
      "midterm-1": 19,
      "midterm-2": 18,
      labs: 28,
      activity: 9,
      exam: 17,
    });
    const originalFormula = JSON.stringify(computerNetworksFormula);

    expect(calculateGrade(computerNetworksFormula, scores)).toMatchObject({
      totalPoints: 91,
      grade: 5,
      passed: true,
      missingComponents: [],
    });
    expect(JSON.stringify(computerNetworksFormula)).toBe(originalFormula);
    expect(scores.exam).toBe(17);
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
        component.code === "exam"
          ? { ...component, weight: 19 }
          : component,
      ),
    };

    expect(() => calculateGrade(formula)).toThrow(
      "Сумма весов компонентов должна быть ровно 100%",
    );
  });

  it("ties the networks formula to the student's real planned exam course", () => {
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
  });
});

function makeSingleComponentFormula(): GradeFormula {
  return {
    ...computerNetworksFormula,
    components: [
      {
        code: "result",
        name: "Итоговые баллы",
        weight: 100,
        maxPoints: 100,
        order: 1,
        requiredForFinal: false,
      },
    ],
  };
}

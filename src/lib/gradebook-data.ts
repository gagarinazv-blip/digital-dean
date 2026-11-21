import {
  calculateGrade,
  gradeFormulas,
  validateGradeFormula,
  type GradeFormula,
} from "@/lib/grade-formula";

export type StudentComponentGrade = {
  studentLogin: string;
  semesterCode: string;
  subjectId: string;
  componentCode: string;
  score: number | null;
  date: string | null;
  comment: string | null;
};

export type GradebookEntry = {
  formula: GradeFormula;
  components: Record<
    string,
    Pick<StudentComponentGrade, "score" | "date" | "comment">
  >;
  scores: Record<string, number>;
};

export const studentComponentGradeSeedData: readonly StudentComponentGrade[] =
  [
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-networks",
      componentCode: "midterm-1",
      score: 19,
      date: "2026-09-20",
      comment: "Контрольная работа",
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-networks",
      componentCode: "midterm-2",
      score: 18,
      date: "2026-10-11",
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-networks",
      componentCode: "labs",
      score: 28,
      date: "2026-11-02",
      comment: "Одна лабораторная сдана с замечаниями",
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-networks",
      componentCode: "activity",
      score: 9,
      date: "2026-11-10",
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-networks",
      componentCode: "exam",
      score: null,
      date: null,
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-algorithms",
      componentCode: "midterm-1",
      score: 19,
      date: "2026-09-18",
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-algorithms",
      componentCode: "labs",
      score: 28,
      date: "2026-10-28",
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-algorithms",
      componentCode: "project",
      score: 29,
      date: "2026-11-06",
      comment: "Проект принят",
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-algorithms",
      componentCode: "exam",
      score: 18,
      date: "2026-11-09",
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-databases",
      componentCode: "midterm-1",
      score: 18,
      date: "2026-09-22",
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-databases",
      componentCode: "labs",
      score: 34,
      date: "2026-10-30",
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-databases",
      componentCode: "project",
      score: 23,
      date: "2026-11-04",
      comment: null,
    },
    {
      studentLogin: "student.alpha",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-databases",
      componentCode: "exam",
      score: 18,
      date: "2026-11-12",
      comment: null,
    },
    {
      studentLogin: "student.beta",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-distributed",
      componentCode: "midterm-1",
      score: 11,
      date: "2026-09-19",
      comment: "Нужно повторить основы",
    },
    {
      studentLogin: "student.beta",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-distributed",
      componentCode: "midterm-2",
      score: 13,
      date: "2026-10-17",
      comment: null,
    },
    {
      studentLogin: "student.beta",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-distributed",
      componentCode: "labs",
      score: 16,
      date: "2026-11-03",
      comment: "Часть заданий не выполнена",
    },
    {
      studentLogin: "student.beta",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-distributed",
      componentCode: "activity",
      score: 5,
      date: "2026-11-10",
      comment: null,
    },
    {
      studentLogin: "student.beta",
      semesterCode: "2026-2027-1",
      subjectId: "pi31-s5-distributed",
      componentCode: "exam",
      score: null,
      date: null,
      comment: null,
    },
  ];

export function getGradebookEntry(
  studentLogin: string,
  semesterCode: string,
  subjectId: string,
): GradebookEntry | null {
  const formula = gradeFormulas.find(
    (item) =>
      item.subjectId === subjectId && item.semesterCode === semesterCode,
  );
  if (!formula) return null;
  validateGradeFormula(formula);

  const studentGrades = studentComponentGradeSeedData.filter(
    (item) =>
      item.studentLogin === studentLogin &&
      item.semesterCode === semesterCode &&
      item.subjectId === subjectId,
  );
  const gradesByCode = new Map(
    studentGrades.map((item) => [item.componentCode, item]),
  );
  const components: GradebookEntry["components"] = {};
  const scores: Record<string, number> = {};
  for (const component of formula.components) {
    const grade = gradesByCode.get(component.code);
    components[component.code] = {
      score: grade?.score ?? null,
      date: grade?.date ?? null,
      comment: grade?.comment ?? null,
    };
    if (grade?.score !== null && grade?.score !== undefined) {
      scores[component.code] = grade.score;
    }
  }
  calculateGrade(formula, scores);

  return { formula, components, scores };
}

type AcademicRecordsSeedData = {
  snapshotDate: string;
  students: readonly {
    login: string;
    semesters: readonly {
      id: string;
      subjects: readonly { id: string }[];
    }[];
  }[];
};

export function validateGradebookSeedData(
  academicRecords: AcademicRecordsSeedData,
): void {
  const formulaKeys = new Set<string>();
  const formulasByKey = new Map<string, GradeFormula>();

  for (const formula of gradeFormulas) {
    validateGradeFormula(formula);
    const key = `${formula.semesterCode}:${formula.subjectId}`;
    if (formulaKeys.has(key)) {
      throw new Error(`Повторяется формула для дисциплины "${key}".`);
    }
    formulaKeys.add(key);
    formulasByKey.set(key, formula);
    ensureSubjectExists(
      academicRecords,
      formula.semesterCode,
      formula.subjectId,
    );
  }

  const studentsByLogin = new Map(
    academicRecords.students.map((student) => [student.login, student]),
  );
  const scoreKeys = new Set<string>();

  for (const grade of studentComponentGradeSeedData) {
    const student = studentsByLogin.get(grade.studentLogin);
    if (!student) {
      throw new Error(`Неизвестный студент "${grade.studentLogin}" в оценках.`);
    }
    ensureSubjectExists(
      academicRecords,
      grade.semesterCode,
      grade.subjectId,
      student,
    );

    const formula = formulasByKey.get(
      `${grade.semesterCode}:${grade.subjectId}`,
    );
    const component = formula?.components.find(
      (item) => item.code === grade.componentCode,
    );
    if (!component) {
      throw new Error(
        `Для оценки "${grade.componentCode}" не найдена формула дисциплины.`,
      );
    }

    const scoreKey = [
      grade.studentLogin,
      grade.semesterCode,
      grade.subjectId,
      grade.componentCode,
    ].join(":");
    if (scoreKeys.has(scoreKey)) {
      throw new Error(`Повторяется оценка компонента "${scoreKey}".`);
    }
    scoreKeys.add(scoreKey);

    if (
      grade.score !== null &&
      (!Number.isFinite(grade.score) ||
        grade.score < 0 ||
        grade.score > component.maxPoints)
    ) {
      throw new RangeError(
        `Оценка "${scoreKey}" должна быть от 0 до ${component.maxPoints}.`,
      );
    }

    if (grade.score === null && grade.date !== null) {
      throw new Error(
        `У неоценённого компонента "${scoreKey}" не должно быть даты оценки.`,
      );
    }
    if (
      grade.date !== null &&
      (!Number.isFinite(Date.parse(grade.date)) ||
        grade.date > academicRecords.snapshotDate)
    ) {
      throw new Error(`Дата оценки "${scoreKey}" выходит за дату снимка.`);
    }
  }

  for (const formula of gradeFormulas) {
    for (const student of academicRecords.students) {
      const isEnrolled = student.semesters.some(
        (semester) =>
          semester.id === formula.semesterCode &&
          semester.subjects.some((subject) => subject.id === formula.subjectId),
      );
      if (!isEnrolled) continue;

      for (const component of formula.components) {
        const scoreKey = [
          student.login,
          formula.semesterCode,
          formula.subjectId,
          component.code,
        ].join(":");
        if (!scoreKeys.has(scoreKey)) {
          throw new Error(`Не задана оценка или статус "${scoreKey}".`);
        }
      }
    }
  }
}

function ensureSubjectExists(
  academicRecords: AcademicRecordsSeedData,
  semesterCode: string,
  subjectId: string,
  student = academicRecords.students.find((candidate) =>
    candidate.semesters.some(
      (semester) =>
        semester.id === semesterCode &&
        semester.subjects.some((subject) => subject.id === subjectId),
    ),
  ),
): void {
  const hasSubject = student?.semesters.some(
    (semester) =>
      semester.id === semesterCode &&
      semester.subjects.some((subject) => subject.id === subjectId),
  );
  if (!hasSubject) {
    throw new Error(
      `Дисциплина "${subjectId}" не найдена у студента в семестре "${semesterCode}".`,
    );
  }
}

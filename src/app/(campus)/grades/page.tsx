import { Suspense } from "react";
import { connection } from "next/server";
import { CampusSection } from "@/components/campus-section";
import { controlTypeLabels } from "@/lib/campus-labels";
import { getAcademicRecords } from "@/lib/academic-records";
import { analyzeGrade } from "@/lib/grade-analysis";
import { getGradebookEntry } from "@/lib/gradebook-data";
import { GradeCalculator } from "./grade-calculator";
import {
  GradesOverview,
  type GradeSemesterSummary,
} from "./grades-overview";
import { GradesTabs } from "./grades-tabs";
import styles from "./grades.module.css";

type GradesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type AcademicSemesterData = NonNullable<
  Awaited<ReturnType<typeof getAcademicRecords>>["dataset"]
>["semesters"][number];

function getNumericGrade(value: string | undefined) {
  if (!value || !/^[2-5](?:[.,]\d+)?$/.test(value.trim())) return null;
  const grade = Number(value.replace(",", "."));
  return Number.isFinite(grade) && grade >= 2 && grade <= 5 ? grade : null;
}

function createSemesterSummary(
  semester: AcademicSemesterData,
  studentLogin: string,
): GradeSemesterSummary {
  const subjects = semester.planItems.map((item) => {
    const gradebookEntry = getGradebookEntry(
      studentLogin,
      semester.code,
      item.id,
    );
    const currentContribution = gradebookEntry
      ? analyzeGrade(gradebookEntry.formula, gradebookEntry.scores)
          .accumulatedContribution
      : null;

    return {
      id: item.id,
      name: item.name,
      controlLabel: controlTypeLabels[item.controlType],
      credits: item.credits,
      resultValue: item.result?.value ?? null,
      resultStatus: item.result?.status ?? null,
      formulaSource: gradebookEntry?.formula.source ?? null,
      currentContribution,
    };
  });
  const numericGrades = semester.planItems
    .map((item) => getNumericGrade(item.result?.value))
    .filter((grade): grade is number => grade !== null);
  const completedCredits = semester.planItems.reduce(
    (total, item) =>
      item.result?.status === "PASSED" ? total + item.credits : total,
    0,
  );

  return {
    id: String(semester.id),
    name: semester.name,
    number: semester.number,
    isCurrent: semester.isCurrent,
    average:
      numericGrades.length > 0
        ? numericGrades.reduce((total, grade) => total + grade, 0) /
          numericGrades.length
        : null,
    completedCredits,
    totalCredits: semester.planItems.reduce(
      (total, item) => total + item.credits,
      0,
    ),
    debtCount: semester.planItems.filter(
      (item) => item.result?.status === "ACADEMIC_DEBT",
    ).length,
    subjects,
  };
}

async function GradesContent({ searchParams }: Required<GradesPageProps>) {
  await connection();
  const params = await searchParams;
  const { dataset, login } = await getAcademicRecords();
  const initialTab = params.tab === "calculator" ? "calculator" : "results";
  const calculatorEntries =
    dataset?.semesters.flatMap((semester) =>
      semester.planItems.flatMap((item) => {
        const entry = getGradebookEntry(login, semester.code, item.id);
        return entry
          ? [
              {
                ...entry,
                officialResult: item.result?.value ?? null,
              },
            ]
          : [];
      }),
    ) ?? [];
  const requestedSubject =
    typeof params.subject === "string" ? params.subject : undefined;
  const initialSubjectId = calculatorEntries.some(
    (entry) => entry.formula.subjectId === requestedSubject,
  )
    ? requestedSubject
    : undefined;

  return (
    <CampusSection
      eyebrow="Учебные результаты"
      title="Успеваемость"
      description="Результаты обучения, оценки и академический прогресс"
    >
      {dataset?.semesters.length ? (
        <GradesTabs
          calculator={
            calculatorEntries.length ? (
              <GradeCalculator
                entries={calculatorEntries}
                initialSubjectId={initialSubjectId}
              />
            ) : null
          }
          initialTab={initialTab}
        >
          <GradesOverview
            academicYear={dataset.academicYear}
            semesters={dataset.semesters.map((semester) =>
              createSemesterSummary(semester, login),
            )}
          />
        </GradesTabs>
      ) : (
        <div className={styles.empty}>
          <strong>Данные не найдены</strong>
          <p>Для этой учётной записи пока нет учебного плана.</p>
        </div>
      )}
    </CampusSection>
  );
}

function GradesFallback() {
  return (
    <CampusSection
      eyebrow="Учебные результаты"
      title="Успеваемость"
      description="Загружаем данные текущего студента."
    >
      <div aria-busy="true" className={styles.gradesSkeleton}>
        <span />
        <span />
        <span />
      </div>
    </CampusSection>
  );
}

export default function GradesPage({ searchParams }: GradesPageProps) {
  return (
    <Suspense fallback={<GradesFallback />}>
      <GradesContent searchParams={searchParams ?? Promise.resolve({})} />
    </Suspense>
  );
}

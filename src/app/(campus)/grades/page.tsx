import { Suspense } from "react";
import { connection } from "next/server";
import { CampusSection } from "@/components/campus-section";
import type {
  AcademicResultStatus,
  AcademicSessionStatus,
  StudyForm,
} from "@/generated/prisma/enums";
import { controlTypeLabels } from "@/lib/campus-labels";
import { formatCampusDate, formatCampusTime } from "@/lib/campus-time";
import { getAcademicRecords } from "@/lib/academic-records";
import { computerNetworksFormula } from "@/lib/grade-formula";
import { GradeCalculator } from "./grade-calculator";
import styles from "./grades.module.css";

export const instant = false;

const studyFormLabels: Record<StudyForm, string> = {
  FULL_TIME: "очная",
  PART_TIME: "очно-заочная",
  CORRESPONDENCE: "заочная",
};

const resultStatusLabels: Record<AcademicResultStatus, string> = {
  PASSED: "Сдано",
  ACADEMIC_DEBT: "Академическая задолженность",
};

const sessionStatusLabels: Record<AcademicSessionStatus, string> = {
  COMPLETED: "Состоялось",
  PLANNED: "Запланировано",
};

function displayDate(date: Date) {
  return formatCampusDate(date);
}

async function GradesContent() {
  await connection();
  const { student, dataset } = await getAcademicRecords();
  const hasGradeFormula = dataset?.semesters.some((semester) =>
    semester.planItems.some(
      (item) => item.id === computerNetworksFormula.subjectId,
    ),
  );

  return (
    <CampusSection
      eyebrow="Учебные результаты"
      title="Учебный план и оценки"
      description={
        dataset
          ? `${dataset.academicYear} учебный год · данные на ${displayDate(dataset.snapshotDate)}`
          : "Учебный план и результаты аттестации"
      }
    >
      {dataset?.semesters.length ? (
        <>
          <section className={styles.studentSummary}>
            <h2>{student.fullName}</h2>
            <p>
              Зачётная книжка: {student.recordBookNumber ?? "не указана"} ·
              группа {student.group.name} · курс {student.course}
            </p>
            <p>
              {student.direction}
              {student.studyForm
                ? ` · ${studyFormLabels[student.studyForm]} форма обучения`
                : ""}
            </p>
          </section>

          {hasGradeFormula && (
            <GradeCalculator formula={computerNetworksFormula} />
          )}

          <div className={styles.semesterList}>
            {dataset.semesters.map((semester) => {
              const sessions = semester.planItems
                .flatMap((planItem) =>
                  planItem.sessions.map((session) => ({
                    ...session,
                    subject: planItem.name,
                    controlType: planItem.controlType,
                  })),
                )
                .sort(
                  (first, second) =>
                    first.date.getTime() - second.date.getTime() ||
                    first.startTime.getTime() - second.startTime.getTime(),
                );

              return (
                <section
                  aria-labelledby={`semester-${semester.id}`}
                  className={styles.semester}
                  key={semester.id}
                >
                  <div className={styles.semesterHeading}>
                    <h2 id={`semester-${semester.id}`}>
                      {semester.name} семестр · {semester.number}-й семестр
                    </h2>
                    {semester.isCurrent && (
                      <span className={styles.currentBadge}>Текущий</span>
                    )}
                  </div>

                  <div
                    aria-label={`Учебный план: ${semester.name} семестр`}
                    className={styles.tableWrap}
                    role="region"
                    tabIndex={0}
                  >
                    <table className={styles.planTable}>
                      <thead>
                        <tr>
                          <th scope="col">Дисциплина</th>
                          <th scope="col">Кафедра и преподаватель</th>
                          <th scope="col">Часы</th>
                          <th scope="col">ЗЕТ</th>
                          <th scope="col">Контроль</th>
                          <th scope="col">Результат и попытки</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semester.planItems.map((item) => (
                          <tr key={item.id}>
                            <th scope="row">
                              <span className={styles.subjectName}>
                                {item.name}
                              </span>
                            </th>
                            <td>
                              {item.department}
                              <span className={styles.subtext}>
                                {item.teacher}
                              </span>
                            </td>
                            <td>{item.hours}</td>
                            <td>{item.credits}</td>
                            <td>{controlTypeLabels[item.controlType]}</td>
                            <td>
                              {item.result ? (
                                <>
                                  <strong
                                    className={
                                      item.result.status === "ACADEMIC_DEBT"
                                        ? styles.debt
                                        : undefined
                                    }
                                  >
                                    {item.result.value}
                                  </strong>
                                  <span className={styles.subtext}>
                                    {resultStatusLabels[item.result.status]} ·{" "}
                                    {displayDate(item.result.date)}
                                  </span>
                                  <span className={styles.subtext}>
                                    Попыток: {item.result.attemptCount}
                                  </span>
                                  <ul className={styles.attemptList}>
                                    {item.result.attempts.map((attempt) => (
                                      <li key={attempt.id}>
                                        {attempt.attemptNumber}-я:{" "}
                                        {attempt.value} ·{" "}
                                        {displayDate(attempt.date)}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : (
                                <span className={styles.subtext}>
                                  Ещё не сдавал(а)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {semester.isCurrent && (
                    <section
                      aria-labelledby={`session-${semester.id}`}
                      className={styles.sessionSection}
                    >
                      <h3 id={`session-${semester.id}`}>Сессия</h3>
                      {sessions.length ? (
                        <ul className={styles.sessionList}>
                          {sessions.map((session) => (
                            <li
                              className={styles.sessionItem}
                              key={session.id}
                            >
                              <div>
                                <strong>{session.subject}</strong>
                                <span className={styles.subtext}>
                                  {controlTypeLabels[session.controlType]} ·{" "}
                                  {displayDate(session.date)} ·{" "}
                                  {formatCampusTime(session.startTime)}–
                                  {formatCampusTime(session.endTime)} ·{" "}
                                  {session.room}
                                </span>
                              </div>
                              <span
                                className={
                                  session.status === "PLANNED"
                                    ? styles.plannedBadge
                                    : styles.completedBadge
                                }
                              >
                                {sessionStatusLabels[session.status]}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.empty}>
                          Расписание сессии пока не опубликовано.
                        </p>
                      )}
                    </section>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          <strong>Данные не найдены</strong>
          <p>
            Для этой учётной записи нет учебного плана. Выполните миграции и
            загрузите демонстрационные данные командой{" "}
            <code>npx prisma db seed</code>.
          </p>
        </div>
      )}
    </CampusSection>
  );
}

function GradesFallback() {
  return (
    <CampusSection
      eyebrow="Учебные результаты"
      title="Учебный план и оценки"
      description="Загружаем данные текущего студента."
    >
      <p aria-busy="true">Загружаем учебный план и оценки…</p>
    </CampusSection>
  );
}

export default function GradesPage() {
  return (
    <Suspense fallback={<GradesFallback />}>
      <GradesContent />
    </Suspense>
  );
}

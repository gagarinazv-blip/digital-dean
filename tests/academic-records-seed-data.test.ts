import { describe, expect, it } from "vitest";
import { academicRecordsSeedData } from "../prisma/academic-records-seed-data";

describe("academic records seed data", () => {
  it("includes two students with two semesters of seven subjects", () => {
    expect(academicRecordsSeedData.students).toHaveLength(2);
    expect(
      academicRecordsSeedData.students.map((student) => student.login),
    ).toEqual(["student.alpha", "student.beta"]);
    for (const student of academicRecordsSeedData.students) {
      expect(student.semesters).toHaveLength(2);
      for (const semester of student.semesters) {
        expect(semester.subjects).toHaveLength(7);
        expect(semester.subjects.every((subject) => subject.hours > 0)).toBe(
          true,
        );
        expect(
          semester.subjects.every((subject) => subject.credits > 0),
        ).toBe(true);
      }
    }
  });

  it("keeps result attempts ordered and linked to planned subjects", () => {
    for (const student of academicRecordsSeedData.students) {
      for (const semester of student.semesters) {
        const subjectIds = new Set(
          semester.subjects.map((subject) => subject.id),
        );

        for (const result of semester.results) {
          expect(subjectIds.has(result.subjectId)).toBe(true);
          expect(result.attemptCount).toBe(result.attempts.length);
          expect(result.attempts.at(-1)).toMatchObject({
            date: result.date,
            value: result.value,
          });
          expect(
            result.attempts.map((attempt) => attempt.attempt),
          ).toEqual(result.attempts.map((_, index) => index + 1));
          expect(
            result.attempts.map((attempt) => attempt.date),
          ).toEqual(
            [...result.attempts]
              .map((attempt) => attempt.date)
              .sort(),
          );
          for (const attempt of result.attempts) {
            expect(
              attempt.value === "Зачтено" ||
                attempt.value === "Не зачтено" ||
                /^[2-5]$/.test(attempt.value),
            ).toBe(true);
          }
        }
      }

      const currentSemester = student.semesters[0];
      const currentSubjectIds = new Set(
        currentSemester.subjects.map((subject) => subject.id),
      );
      const scheduleByDate = new Map<
        string,
        { startTime: string; endTime: string }[]
      >();

      for (const item of student.currentSemesterSchedule) {
        expect(item.semesterId).toBe(currentSemester.id);
        expect(currentSubjectIds.has(item.subjectId)).toBe(true);
        expect(item.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(item.endTime > item.startTime).toBe(true);
        const subject = currentSemester.subjects.find(
          (entry) => entry.id === item.subjectId,
        );
        expect(item.controlType).toBe(subject?.controlType);

        const subjectResult = currentSemester.results.find(
          (result) => result.subjectId === item.subjectId,
        );
        const hasMatchingAttempt = subjectResult?.attempts.some(
          (attempt) => attempt.date === item.date,
        );
        if (item.status === "COMPLETED") {
          expect(item.date <= academicRecordsSeedData.snapshotDate).toBe(true);
          expect(hasMatchingAttempt).toBe(true);
        } else {
          expect(item.date > academicRecordsSeedData.snapshotDate).toBe(true);
          expect(hasMatchingAttempt).toBeFalsy();
        }

        const day = scheduleByDate.get(item.date) ?? [];
        day.push(item);
        scheduleByDate.set(item.date, day);
      }

      for (const day of scheduleByDate.values()) {
        const ordered = [...day].sort((first, second) =>
          first.startTime.localeCompare(second.startTime),
        );
        for (let index = 1; index < ordered.length; index += 1) {
          expect(ordered[index].startTime >= ordered[index - 1].endTime).toBe(
            true,
          );
        }
      }
    }
  });

  it("contains both passed and planned session events and the requested outcomes", () => {
    const [strongStudent, studentWithDebt] = academicRecordsSeedData.students;

    expect(
      strongStudent.semesters[0].results.every(
        (result) =>
          result.status === "PASSED" &&
          (result.value === "Зачтено" || Number(result.value) >= 4),
      ),
    ).toBe(true);
    expect(
      studentWithDebt.semesters[0].results.filter(
        (result) => result.status === "ACADEMIC_DEBT",
      ),
    ).toHaveLength(1);
    expect(
      studentWithDebt.semesters[0].results.some(
        (result) => result.attemptCount > 1,
      ),
    ).toBe(true);

    for (const student of academicRecordsSeedData.students) {
      expect(
        student.currentSemesterSchedule.some(
          (item) => item.status === "COMPLETED",
        ),
      ).toBe(true);
      expect(
        student.currentSemesterSchedule.some(
          (item) => item.status === "PLANNED",
        ),
      ).toBe(true);
    }
  });
});

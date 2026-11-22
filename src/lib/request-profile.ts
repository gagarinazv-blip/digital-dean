import type { RequestProfileSnapshot } from "@/lib/request-catalog";
import type { StudyForm } from "@/generated/prisma/enums";

/** Сведения студента, которые сохраняются в заявке на момент подачи. */
export function getRequestProfileSnapshot(student: {
  fullName: string;
  faculty: string;
  direction: string;
  course: number;
  group: { name: string };
  recordBookNumber: string | null;
  studyForm: StudyForm | null;
}): RequestProfileSnapshot {
  return {
    fullName: student.fullName,
    faculty: student.faculty,
    direction: student.direction,
    course: student.course,
    groupName: student.group.name,
    recordBookNumber: student.recordBookNumber,
    studyForm: student.studyForm,
  };
}

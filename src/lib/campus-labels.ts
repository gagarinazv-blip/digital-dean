import type {
  ControlType,
  RequestStatus,
  RequestType,
  ScheduleKind,
  ScheduleStatus,
} from "@/generated/prisma/enums";

export const scheduleKindLabels: Record<ScheduleKind, string> = {
  LECTURE: "Лекция",
  SEMINAR: "Семинар",
  PRACTICE: "Практика",
};

export const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  PLANNED: "По плану",
  RESCHEDULED: "Перенесено",
  CANCELLED: "Отменено",
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  NEEDS_INFO: "Нужны данные",
  READY: "Готова",
  REJECTED: "Отклонена",
  CANCELLED: "Отменена",
};

export const requestTypeLabels: Record<RequestType, string> = {
  CERTIFICATE: "Справка",
  APPLICATION: "Заявление",
  OTHER: "Другое обращение",
};

export const controlTypeLabels: Record<ControlType, string> = {
  EXAM: "Экзамен",
  CREDIT: "Зачёт",
  DIFFERENTIATED_CREDIT: "Дифференцированный зачёт",
  COURSEWORK: "Курсовая работа",
  OTHER: "Другое",
};

const studentFacingGroupNames: Record<string, string> = {
  "TEST-ACADEMIC-31A": "ИС-21",
  "TEST-ACADEMIC-31B": "ИС-22",
  "TEST-ACADEMIC-31": "ИС-20",
};

export function cleanStudentFacingText(value: string): string {
  return value
    .replace(/\[TEST SEED\][ \t]*/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function getStudentFacingGroupName(name: string): string {
  return studentFacingGroupNames[name] ?? cleanStudentFacingText(name);
}

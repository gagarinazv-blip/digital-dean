import type {
  ControlType,
  RequestStatus,
  RequestType,
} from "@/generated/prisma/enums";

export const requestStatusLabels: Record<RequestStatus, string> = {
  PENDING: "Ожидает",
  IN_PROGRESS: "В работе",
  APPROVED: "Одобрена",
  REJECTED: "Отклонена",
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

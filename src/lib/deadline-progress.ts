import type {
  DeadlineFormat,
  DeadlineProgressStatus,
} from "@/generated/prisma/enums";

export type DeadlineChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

const progressStatuses: readonly DeadlineProgressStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "DONE",
];

const defaultChecklists: Record<DeadlineFormat, readonly string[]> = {
  ONLINE: [
    "Прочитать задание и критерии",
    "Изучить материалы преподавателя",
    "Выполнить работу",
    "Сверить результат с критериями",
    "Отправить работу до срока",
  ],
  OFFLINE: [
    "Прочитать задание и критерии",
    "Изучить материалы преподавателя",
    "Выполнить работу",
    "Подготовиться к ответам на вопросы",
    "Проверить место и время",
  ],
  EXAM: [
    "Уточнить список вопросов",
    "Повторить лекции и материалы",
    "Разобрать типовые задания",
    "Проверить аудиторию и время",
    "Подготовить зачётную книжку",
  ],
};

export function isDeadlineProgressStatus(
  value: unknown,
): value is DeadlineProgressStatus {
  return progressStatuses.some((status) => status === value);
}

export function getDefaultDeadlineChecklist(
  format: DeadlineFormat,
): DeadlineChecklistItem[] {
  return defaultChecklists[format].map((text, index) => ({
    id: `step-${index + 1}`,
    text,
    done: false,
  }));
}

function isChecklistItem(value: unknown): value is DeadlineChecklistItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.text === "string" &&
    typeof item.done === "boolean"
  );
}

// Пустой или повреждённый список заменяется списком по умолчанию для формата.
export function readDeadlineChecklist(
  value: unknown,
  format: DeadlineFormat,
): DeadlineChecklistItem[] {
  const items = Array.isArray(value) ? value.filter(isChecklistItem) : [];
  return items.length > 0
    ? items.map(({ id, text, done }) => ({ id, text, done }))
    : getDefaultDeadlineChecklist(format);
}

export function setChecklistItemDone(
  checklist: readonly DeadlineChecklistItem[],
  itemId: string,
  done: boolean,
): DeadlineChecklistItem[] | null {
  if (!checklist.some((item) => item.id === itemId)) return null;
  return checklist.map((item) =>
    item.id === itemId ? { ...item, done } : item,
  );
}

export function getChecklistProgress(
  checklist: readonly DeadlineChecklistItem[],
) {
  const done = checklist.filter((item) => item.done).length;
  return {
    done,
    total: checklist.length,
    label: `${done} из ${checklist.length}`,
  };
}

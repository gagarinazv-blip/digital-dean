import {
  getUniversityDateTimeFormatter,
  UNIVERSITY_TIME_ZONE,
} from "@/lib/campus-time";

const UNIVERSITY_DATE_FORMATTER = getUniversityDateTimeFormatter({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}, "en-US");
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = [
  "ЯНВ",
  "ФЕВ",
  "МАР",
  "АПР",
  "МАЙ",
  "ИЮН",
  "ИЮЛ",
  "АВГ",
  "СЕН",
  "ОКТ",
  "НОЯ",
  "ДЕК",
];

function getUniversityDateParts(date: Date): Record<string, number> {
  return Object.fromEntries(
    UNIVERSITY_DATE_FORMATTER.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

export type DeadlineLike = {
  id: string;
  dueAt: Date;
  status: "OPEN" | "SUBMITTED";
};

export type DeadlineDateTile = {
  caption: string;
  day: string;
};

export type DeadlineCountdown = {
  kind: "OVERDUE" | "TODAY" | "TOMORROW" | "UPCOMING";
  daysRemaining: number;
  label: string;
};

function moscowDayNumber(date: Date): number {
  const parts = getUniversityDateParts(date);
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_IN_MILLISECONDS
  );
}

export function getDeadlineDateTile(
  dueAt: Date,
  now: Date,
): DeadlineDateTile {
  const dayDifference = moscowDayNumber(dueAt) - moscowDayNumber(now);
  const dateParts = getUniversityDateParts(dueAt);
  const month = dateParts.month;
  const monthLabel = MONTH_LABELS[month - 1];
  if (!monthLabel) {
    throw new RangeError(
      `Некорректный месяц даты дедлайна в ${UNIVERSITY_TIME_ZONE}.`,
    );
  }

  return {
    caption:
      dayDifference === 0
        ? "Сегодня"
        : dayDifference === 1
          ? "Завтра"
          : monthLabel,
    day: String(dateParts.day).padStart(2, "0"),
  };
}

function dayWord(days: number): string {
  const lastTwoDigits = days % 100;
  const lastDigit = days % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}

export function getDeadlineCountdown(
  dueAt: Date,
  now: Date,
): DeadlineCountdown {
  const daysRemaining = moscowDayNumber(dueAt) - moscowDayNumber(now);
  if (daysRemaining < 0) {
    const daysOverdue = Math.abs(daysRemaining);
    return {
      kind: "OVERDUE",
      daysRemaining,
      label: `Просрочено на ${daysOverdue} ${dayWord(daysOverdue)}`,
    };
  }
  if (daysRemaining === 0) {
    return { kind: "TODAY", daysRemaining: 0, label: "Сегодня" };
  }
  if (daysRemaining === 1) {
    return { kind: "TOMORROW", daysRemaining, label: "Завтра" };
  }

  return {
    kind: "UPCOMING",
    daysRemaining,
    label: `Через ${daysRemaining} ${dayWord(daysRemaining)}`,
  };
}

export function getUpcomingDeadlines<T extends DeadlineLike>(
  deadlines: readonly T[],
  now: Date,
  limit = 5,
): T[] {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError("Лимит дедлайнов должен быть неотрицательным.");
  }

  const today = moscowDayNumber(now);
  return deadlines
    .filter(
      (deadline) =>
        deadline.status === "OPEN" &&
        moscowDayNumber(deadline.dueAt) >= today,
    )
    .slice()
    .sort(
      (first, second) =>
        first.dueAt.getTime() - second.dueAt.getTime() ||
        first.id.localeCompare(second.id),
    )
    .slice(0, limit);
}

export function getDeadlineCountdownTone(
  countdown: DeadlineCountdown,
): "warning" | "danger" | "neutral" {
  if (countdown.kind === "TODAY") return "warning";
  if (
    countdown.kind === "OVERDUE" ||
    countdown.kind === "TOMORROW" ||
    countdown.daysRemaining <= 3
  ) {
    return "danger";
  }
  return "neutral";
}

export function getNearestDeadlines<T extends DeadlineLike>(
  deadlines: readonly T[],
  limit = 5,
): T[] {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError("Лимит дедлайнов должен быть неотрицательным.");
  }

  return deadlines
    .filter((deadline) => deadline.status === "OPEN")
    .slice()
    .sort(
      (first, second) =>
        first.dueAt.getTime() - second.dueAt.getTime() ||
        first.id.localeCompare(second.id),
    )
    .slice(0, limit);
}

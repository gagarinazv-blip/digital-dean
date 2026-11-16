const MOSCOW_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type DeadlineLike = {
  id: string;
  dueAt: Date;
  status: "OPEN" | "SUBMITTED";
};

export type DeadlineCountdown = {
  kind: "OVERDUE" | "TODAY" | "UPCOMING";
  daysRemaining: number;
  label: string;
};

function moscowDayNumber(date: Date): number {
  const parts = Object.fromEntries(
    MOSCOW_DATE_FORMATTER.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_IN_MILLISECONDS
  );
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
  if (dueAt.getTime() < now.getTime()) {
    return { kind: "OVERDUE", daysRemaining: 0, label: "Просрочено" };
  }

  const daysRemaining = moscowDayNumber(dueAt) - moscowDayNumber(now);
  if (daysRemaining === 0) {
    return { kind: "TODAY", daysRemaining: 0, label: "Сегодня" };
  }

  return {
    kind: "UPCOMING",
    daysRemaining,
    label: `Осталось ${daysRemaining} ${dayWord(daysRemaining)}`,
  };
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

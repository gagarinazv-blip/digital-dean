import type { Weekday } from "@/generated/prisma/enums";

const moscowDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const moscowTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Moscow",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const weekdaysByUtcDay: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function getNumericParts(
  formatter: Intl.DateTimeFormat,
  date: Date,
): Record<string, number> {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function moscowMidnightAsUtc(date: Date): Date {
  const wallClockAsUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const moscowParts = getNumericParts(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }),
    new Date(wallClockAsUtc),
  );
  const shiftedWallClockAsUtc = Date.UTC(
    moscowParts.year,
    moscowParts.month - 1,
    moscowParts.day,
    moscowParts.hour,
    moscowParts.minute,
    moscowParts.second,
  );
  return new Date(wallClockAsUtc - (shiftedWallClockAsUtc - wallClockAsUtc));
}

export function getMoscowWeek(now = new Date()) {
  const todayParts = getNumericParts(moscowDateFormatter, now);
  const startDate = new Date(
    Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day),
  );
  const endDate = addUtcDays(startDate, 7);
  const startInstant = moscowMidnightAsUtc(startDate);
  const endInstant = moscowMidnightAsUtc(endDate);
  const timeParts = getNumericParts(moscowTimeFormatter, now);

  return {
    startDate,
    endDate,
    startInstant,
    endInstant,
    todayKey: startDate.toISOString().slice(0, 10),
    currentTimeMinutes: timeParts.hour * 60 + timeParts.minute,
    weekdays: Array.from({ length: 7 }, (_, index) => {
      return weekdaysByUtcDay[addUtcDays(startDate, index).getUTCDay()];
    }),
  };
}

export function getCampusGreeting(now = new Date()): string {
  const hour = getNumericParts(moscowTimeFormatter, now).hour;
  if (hour < 5 || hour >= 22) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

export function formatRemainingMoscowDays(
  deadline: Date,
  now = new Date(),
): string {
  if (deadline.getTime() <= now.getTime()) {
    return "срок истёк";
  }

  const today = getNumericParts(moscowDateFormatter, now);
  const due = getNumericParts(moscowDateFormatter, deadline);
  const dayDifference =
    (Date.UTC(due.year, due.month - 1, due.day) -
      Date.UTC(today.year, today.month - 1, today.day)) /
    (24 * 60 * 60 * 1000);

  if (dayDifference === 0) return "сегодня";
  if (dayDifference === 1) return "завтра";

  const lastTwoDigits = dayDifference % 100;
  const lastDigit = dayDifference % 10;
  const word =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? "дней"
      : lastDigit === 1
        ? "день"
        : lastDigit >= 2 && lastDigit <= 4
          ? "дня"
          : "дней";

  return `через ${dayDifference} ${word}`;
}

export function formatCampusDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatCampusTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMoscowDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function getTimeMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function getCampusTime(now = new Date()): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

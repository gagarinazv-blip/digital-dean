import type { Weekday } from "@/generated/prisma/enums";

export const UNIVERSITY_TIME_ZONE = "Europe/Moscow";

export function getUniversityDateTimeFormatter(
  options: Intl.DateTimeFormatOptions,
  locale = "ru-RU",
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: UNIVERSITY_TIME_ZONE,
  });
}

export function formatUniversityDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = "ru-RU",
): string {
  return getUniversityDateTimeFormatter(options, locale).format(date);
}

export function formatUniversityClockTime(time: Date): string {
  return `${String(time.getUTCHours()).padStart(2, "0")}:${String(
    time.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

const moscowDateFormatter = getUniversityDateTimeFormatter({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}, "en-US");

const moscowTimeFormatter = getUniversityDateTimeFormatter({
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}, "en-US");

const moscowDateTimeFormatter = getUniversityDateTimeFormatter({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
}, "en-US");

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

function moscowWallClockAsUtc(
  date: Date,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const wallClockAsUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hour,
    minute,
    second,
  );
  const moscowParts = getNumericParts(
    moscowDateTimeFormatter,
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

function moscowMidnightAsUtc(date: Date): Date {
  return moscowWallClockAsUtc(date, 0, 0);
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

export function getMoscowCalendarWeek(now = new Date()) {
  const todayParts = getNumericParts(moscowDateFormatter, now);
  const today = new Date(
    Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day),
  );
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const startDate = addUtcDays(today, -daysSinceMonday);
  const endDate = addUtcDays(startDate, 7);

  return {
    startDate,
    endDate,
    startInstant: moscowMidnightAsUtc(startDate),
    endInstant: moscowMidnightAsUtc(endDate),
    todayKey: today.toISOString().slice(0, 10),
    weekdays: Array.from({ length: 7 }, (_, index) => {
      return weekdaysByUtcDay[addUtcDays(startDate, index).getUTCDay()];
    }),
  };
}

export function getMoscowDayRange(now = new Date()) {
  const todayParts = getNumericParts(moscowDateFormatter, now);
  const startDate = new Date(
    Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day),
  );
  const endDate = addUtcDays(startDate, 1);
  const weekday = weekdaysByUtcDay[startDate.getUTCDay()];

  return {
    startDate,
    endDate,
    startInstant: moscowMidnightAsUtc(startDate),
    endInstant: moscowMidnightAsUtc(endDate),
    todayKey: startDate.toISOString().slice(0, 10),
    weekdays: [weekday],
  };
}

export function getMoscowWeekRange(now = new Date()) {
  return getMoscowCalendarWeek(now);
}

export function getMoscowMonthRange(now = new Date()) {
  const dateParts = getNumericParts(moscowDateFormatter, now);
  const monthStart = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, 1),
  );
  const daysSinceMonday = (monthStart.getUTCDay() + 6) % 7;
  const startDate = addUtcDays(monthStart, -daysSinceMonday);
  const endDate = addUtcDays(startDate, 42);

  return {
    startDate,
    endDate,
    startInstant: moscowMidnightAsUtc(startDate),
    endInstant: moscowMidnightAsUtc(endDate),
    todayKey: getMoscowDateKey(now),
    weekdays: Array.from({ length: 42 }, (_, index) => {
      return weekdaysByUtcDay[addUtcDays(startDate, index).getUTCDay()];
    }),
  };
}

export function getMoscowDateKey(date: Date): string {
  const parts = getNumericParts(moscowDateFormatter, date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

export function getMoscowTimeMinutes(date: Date): number {
  const parts = getNumericParts(moscowTimeFormatter, date);
  return parts.hour * 60 + parts.minute;
}

export function getMoscowDateTime(date: Date, time: Date): Date {
  return moscowWallClockAsUtc(
    date,
    time.getUTCHours(),
    time.getUTCMinutes(),
    time.getUTCSeconds(),
  );
}

export function getMoscowDateTimeOnDate(date: Date, timeSource = new Date()) {
  const timeParts = getNumericParts(moscowDateTimeFormatter, timeSource);
  return moscowWallClockAsUtc(
    date,
    timeParts.hour,
    timeParts.minute,
    timeParts.second,
  );
}

export function getCampusGreeting(now = new Date()): string {
  const hour = getNumericParts(moscowTimeFormatter, now).hour;
  if (hour < 5 || hour >= 23) return "Доброй ночи";
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
  return formatUniversityDateTime(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatCampusTime(date: Date): string {
  return formatUniversityDateTime(date, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function formatMoscowDate(date: Date): string {
  return formatUniversityDateTime(date, {
    day: "numeric",
    month: "long",
  });
}

export function formatMoscowWeekdayDate(date: Date): string {
  return formatUniversityDateTime(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatMoscowTime(date: Date): string {
  return formatUniversityDateTime(date, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function getTimeMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function getCampusTime(now = new Date()): string {
  return formatUniversityDateTime(now, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

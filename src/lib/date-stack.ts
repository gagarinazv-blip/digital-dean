import {
  formatMoscowTime,
  getMoscowDateKey,
  getUniversityDateTimeFormatter,
  parseMoscowDateTime,
} from "@/lib/campus-time";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const URGENT_WINDOW = 48 * HOUR;
const PAST_RELATIVE_DAYS = 30;

const dayMonthFormatter = getUniversityDateTimeFormatter({
  day: "numeric",
  month: "long",
});
const weekdayFormatter = getUniversityDateTimeFormatter({ weekday: "short" });

export type DateStackUrgency = "overdue" | "urgent" | null;

export type DateStackLabels = {
  /** Первая строка: календарный день в Москве. */
  day: string;
  /** Вторая строка: время и отсчёт; null, если добавить нечего. */
  detail: string | null;
  urgency: DateStackUrgency;
  /** Текстовая пометка срочности для первой строки. */
  urgencyLabel: string | null;
  /** Значение атрибута datetime. */
  dateTime: string;
  /** Полная дата для подсказки. */
  title: string;
};

export type DateStackOptions = {
  now: Date | null;
  end?: Date | null;
  allDay?: boolean;
  /** Дедлайн после срока «просрочен», обычное событие — «назад». */
  kind?: "event" | "deadline";
  /** Завершённый дедлайн не бывает ни срочным, ни просроченным. */
  done?: boolean;
};

function dayNumber(date: Date): number {
  return Date.parse(`${getMoscowDateKey(date)}T00:00:00.000Z`) / DAY;
}

export function getCalendarDayDifference(date: Date, now: Date): number {
  return dayNumber(date) - dayNumber(now);
}

export function pluralizeDays(count: number): string {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}

export function formatStackDay(date: Date, now: Date | null): string {
  const dayMonth = dayMonthFormatter.format(date);
  const year = getMoscowDateKey(date).slice(0, 4);
  if (!now) return `${dayMonth} ${year}`;

  const difference = getCalendarDayDifference(date, now);
  if (difference === 0) return "Сегодня";
  if (difference === 1) return "Завтра";
  if (difference === -1) return "Вчера";
  if (Math.abs(difference) < 7) {
    const weekday = weekdayFormatter.format(date);
    return `${weekday.charAt(0).toLocaleUpperCase("ru-RU")}${weekday.slice(1)}, ${dayMonth}`;
  }
  return getMoscowDateKey(now).slice(0, 4) === year
    ? dayMonth
    : `${dayMonth} ${year}`;
}

function formatDuration(milliseconds: number, calendarDays: number): string {
  const distance = Math.abs(milliseconds);
  const minutes = milliseconds > 0
    ? Math.ceil(distance / MINUTE)
    : Math.max(1, Math.floor(distance / MINUTE));
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.round(distance / HOUR);
  if (hours < 24) return `${Math.max(1, hours)} ч`;
  const days = Math.max(1, Math.abs(calendarDays));
  return `${days} ${pluralizeDays(days)}`;
}

function formatRelative(
  value: Date,
  { now, end, allDay, kind, done }: DateStackOptions & { now: Date },
): string | null {
  const isOverdueKind = kind === "deadline" && !done;
  const calendarDays = getCalendarDayDifference(value, now);

  if (allDay) {
    if (calendarDays === 0) return null;
    const days = Math.abs(calendarDays);
    const label = `${days} ${pluralizeDays(days)}`;
    if (calendarDays > 0) return `через ${label}`;
    if (isOverdueKind) return `просрочено на ${label}`;
    return days <= PAST_RELATIVE_DAYS ? `${label} назад` : null;
  }

  const untilStart = value.getTime() - now.getTime();
  if (untilStart > 0) {
    return `через ${formatDuration(untilStart, calendarDays)}`;
  }
  if (end && now.getTime() < end.getTime()) return "идёт сейчас";

  // Прошедшее занятие отсчитывается от его окончания.
  const finish = end ?? value;
  const sinceFinish = finish.getTime() - now.getTime();
  if (isOverdueKind && sinceFinish < 0) {
    return `просрочено на ${formatDuration(
      sinceFinish,
      getCalendarDayDifference(finish, now),
    )}`;
  }
  if (sinceFinish > -MINUTE) return "сейчас";
  const finishDays = getCalendarDayDifference(finish, now);
  if (Math.abs(finishDays) > PAST_RELATIVE_DAYS) return null;
  return `${formatDuration(sinceFinish, finishDays)} назад`;
}

function getUrgency(
  value: Date,
  { now, allDay, kind, done }: DateStackOptions & { now: Date },
): DateStackUrgency {
  if (kind !== "deadline" || done) return null;
  if (allDay) {
    const days = getCalendarDayDifference(value, now);
    return days < 0 ? "overdue" : days < 2 ? "urgent" : null;
  }
  const remaining = value.getTime() - now.getTime();
  if (remaining < 0) return "overdue";
  return remaining < URGENT_WINDOW ? "urgent" : null;
}

const urgencyLabels = { overdue: "просрочено", urgent: "срочно" } as const;

export function getDateStackLabels(
  value: Date,
  options: DateStackOptions,
): DateStackLabels {
  const { now, end = null, allDay = false } = options;
  const time = allDay
    ? null
    : end
      ? `${formatMoscowTime(value)}–${formatMoscowTime(end)}`
      : formatMoscowTime(value);
  const relative = now ? formatRelative(value, { ...options, now }) : null;
  const urgency = now ? getUrgency(value, { ...options, now }) : null;
  const dateKey = getMoscowDateKey(value);
  const fullDay = `${dayMonthFormatter.format(value)} ${dateKey.slice(0, 4)}`;

  return {
    day: formatStackDay(value, now),
    detail: [time, relative].filter(Boolean).join(" · ") || null,
    urgency,
    // «просрочено на …» уже есть во второй строке, повторять не нужно.
    urgencyLabel: urgency === "urgent" ? urgencyLabels.urgent : null,
    dateTime: allDay ? dateKey : value.toISOString(),
    title: time ? `${fullDay}, ${time}` : fullDay,
  };
}

export function parseStackDate(value: Date | string): Date {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseMoscowDateTime(value, "12:00")
    : new Date(value);
}

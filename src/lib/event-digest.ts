import type { Event } from "@/generated/prisma/client";
import { getDemoNow } from "@/lib/demo-date";
import {
  formatMoscowWeekdayDate,
  getMoscowCalendarWeek,
} from "@/lib/campus-time";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type DigestWeek = ReturnType<typeof getMoscowCalendarWeek>;
export type DigestEvent = Pick<
  Event,
  | "id"
  | "title"
  | "type"
  | "description"
  | "eventDate"
  | "startsAt"
  | "endsAt"
  | "location"
  | "host"
  | "registrationUrl"
  | "status"
>;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function getDigestWeek(
  requestedWeek: unknown,
  now = getDemoNow(),
): DigestWeek {
  const currentWeek = getMoscowCalendarWeek(now);
  if (!isDateKey(requestedWeek)) return currentWeek;

  const week = getMoscowCalendarWeek(
    new Date(`${requestedWeek}T12:00:00.000Z`),
  );
  return week.startDate.toISOString().slice(0, 10) === requestedWeek
    ? week
    : currentWeek;
}

export function getDigestWeekKey(week: DigestWeek): string {
  return week.startDate.toISOString().slice(0, 10);
}

export function getDigestWeekHref(
  week: DigestWeek,
  offset: number,
  eventType?: string,
): string {
  const date = new Date(week.startDate);
  date.setUTCDate(date.getUTCDate() + offset * 7);
  const params = new URLSearchParams({
    week: date.toISOString().slice(0, 10),
  });
  if (eventType) params.set("type", eventType);
  return `/digest?${params.toString()}`;
}

export function formatDigestWeekRange(week: DigestWeek): string {
  const endDate = new Date(week.startDate.getTime() + 6 * DAY_IN_MILLISECONDS);
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const start = Object.fromEntries(
    formatter
      .formatToParts(week.startDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const end = Object.fromEntries(
    formatter
      .formatToParts(endDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  if (start.month === end.month && start.year === end.year) {
    return `${start.day}–${end.day} ${end.month}`;
  }
  const year =
    start.year === end.year ? "" : ` ${end.year.replace(/\s*г\.$/, "")}`;
  return `${start.day} ${start.month} – ${end.day} ${end.month}${year}`;
}

export function groupEventsByStartDay<T extends DigestEvent>(
  week: DigestWeek,
  events: readonly T[],
) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(week.startDate);
    date.setUTCDate(date.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    return {
      dateKey,
      dateLabel: formatMoscowWeekdayDate(
        new Date(`${dateKey}T12:00:00.000Z`),
      ),
      events: events.filter(
        (event) => event.eventDate.toISOString().slice(0, 10) === dateKey,
      ),
    };
  });
}

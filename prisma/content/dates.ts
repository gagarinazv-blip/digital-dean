import {
  getMoscowCalendarWeek,
  getMoscowDateKey,
  parseMoscowDateTime,
} from "../../src/lib/campus-time";
import { addDemoDays } from "../../src/lib/demo-date";

/** Дата через days дней от сегодня, время московское. */
export function getContentDate(now: Date, days: number, time: string): Date {
  return parseMoscowDateTime(getMoscowDateKey(addDemoDays(days, now)), time);
}

/** День недели (1 — понедельник) со сдвигом в неделях от текущей. */
export function getContentWeekDate(
  now: Date,
  week: number,
  day: number,
  time: string,
): Date {
  const date = new Date(getMoscowCalendarWeek(now).startDate);
  date.setUTCDate(date.getUTCDate() + week * 7 + day - 1);
  return parseMoscowDateTime(date.toISOString().slice(0, 10), time);
}

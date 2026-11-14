import { describe, expect, it } from "vitest";
import {
  formatCampusDate,
  formatMoscowTime,
  formatRemainingMoscowDays,
  getCampusGreeting,
  getMoscowCalendarWeek,
  getMoscowDayRange,
  getMoscowDateKey,
  getMoscowDateTime,
  getMoscowDateTimeOnDate,
  getCampusTime,
  getMoscowWeek,
  getMoscowWeekRange,
} from "../src/lib/campus-time";

describe("Moscow campus time", () => {
  it("uses the Moscow calendar date when UTC is still on the previous day", () => {
    const now = new Date("2026-11-13T21:15:00.000Z");
    const week = getMoscowWeek(now);

    expect(week.todayKey).toBe("2026-11-14");
    expect(week.startInstant.toISOString()).toBe("2026-11-13T21:00:00.000Z");
    expect(week.endInstant.toISOString()).toBe("2026-11-20T21:00:00.000Z");
    expect(week.currentTimeMinutes).toBe(15);
    expect(getCampusTime(now)).toBe("00:15");
  });

  it("formats schedule dates without shifting them to another timezone", () => {
    expect(formatCampusDate(new Date("2026-11-14T00:00:00.000Z"))).toContain(
      "суббота",
    );
  });

  it("uses Monday through Sunday for the Moscow calendar week", () => {
    const now = new Date("2026-11-14T18:00:00.000Z");
    const week = getMoscowCalendarWeek(now);

    expect(week.todayKey).toBe("2026-11-14");
    expect(week.startDate.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(week.endDate.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(week.startInstant.toISOString()).toBe("2026-11-08T21:00:00.000Z");
    expect(week.endInstant.toISOString()).toBe("2026-11-15T21:00:00.000Z");
    expect(week.weekdays[0]).toBe("MONDAY");
    expect(week.weekdays[6]).toBe("SUNDAY");
    expect(getMoscowDateKey(new Date("2026-11-15T21:00:00.000Z"))).toBe(
      "2026-11-16",
    );
  });

  it("calculates Moscow day and week boundaries across Sunday midnight", () => {
    const justBeforeMonday = new Date("2026-11-15T20:59:59.000Z");
    const day = getMoscowDayRange(justBeforeMonday);
    const week = getMoscowWeekRange(justBeforeMonday);

    expect(day.todayKey).toBe("2026-11-15");
    expect(day.startInstant.toISOString()).toBe("2026-11-14T21:00:00.000Z");
    expect(day.endInstant.toISOString()).toBe("2026-11-15T21:00:00.000Z");
    expect(week.startDate.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(week.endDate.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(week.endInstant.toISOString()).toBe("2026-11-15T21:00:00.000Z");

    const mondayMidnight = getMoscowDayRange(
      new Date("2026-11-15T21:00:00.000Z"),
    );
    expect(mondayMidnight.todayKey).toBe("2026-11-16");
    expect(mondayMidnight.startInstant.toISOString()).toBe(
      "2026-11-15T21:00:00.000Z",
    );
  });

  it("converts a Moscow wall-clock time to a UTC timestamp", () => {
    const date = new Date("2026-11-16T00:00:00.000Z");
    const time = new Date("1970-01-01T10:30:00.000Z");
    const startsAt = getMoscowDateTime(date, time);

    expect(startsAt.toISOString()).toBe("2026-11-16T07:30:00.000Z");
    expect(formatMoscowTime(startsAt)).toBe("10:30");
  });

  it("replaces the Moscow calendar date while keeping its current time", () => {
    const simulatedNow = getMoscowDateTimeOnDate(
      new Date("2026-11-15T00:00:00.000Z"),
      new Date("2026-11-14T18:27:00.000Z"),
    );

    expect(simulatedNow.toISOString()).toBe("2026-11-15T18:27:00.000Z");
  });

  it("chooses a greeting using the Moscow hour, not the server hour", () => {
    expect(getCampusGreeting(new Date("2026-11-13T21:00:00.000Z"))).toBe(
      "Доброй ночи",
    );
    expect(getCampusGreeting(new Date("2026-11-14T03:00:00.000Z"))).toBe(
      "Доброе утро",
    );
    expect(getCampusGreeting(new Date("2026-11-14T09:00:00.000Z"))).toBe(
      "Добрый день",
    );
    expect(getCampusGreeting(new Date("2026-11-14T15:00:00.000Z"))).toBe(
      "Добрый вечер",
    );
  });

  it("describes a deadline by its Moscow calendar day", () => {
    const now = new Date("2026-11-14T21:15:00.000Z");

    expect(
      formatRemainingMoscowDays(new Date("2026-11-15T12:00:00.000Z"), now),
    ).toBe("сегодня");
    expect(
      formatRemainingMoscowDays(new Date("2026-11-15T21:00:00.000Z"), now),
    ).toBe("завтра");
    expect(
      formatRemainingMoscowDays(new Date("2026-11-16T21:00:00.000Z"), now),
    ).toBe("через 2 дня");
    expect(
      formatRemainingMoscowDays(new Date("2026-11-14T21:00:00.000Z"), now),
    ).toBe("срок истёк");
  });
});

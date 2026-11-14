import { describe, expect, it } from "vitest";
import {
  formatCampusDate,
  formatRemainingMoscowDays,
  getCampusGreeting,
  getCampusTime,
  getMoscowWeek,
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

import { describe, expect, it } from "vitest";
import {
  getDeadlineCountdownTone,
  getDeadlineCountdown,
  getDeadlineDateTile,
  getNearestDeadlines,
  getUpcomingDeadlines,
} from "../src/lib/deadline-utils";
import { addDemoDays } from "../src/lib/demo-date";

describe("deadline countdown", () => {
  it("labels date tiles as today, tomorrow, or a month and day", () => {
    const now = new Date("2026-11-20T12:00:00.000Z");
    expect(getDeadlineDateTile(new Date("2026-11-20T12:00:00.000Z"), now)).toEqual({
      caption: "Сегодня",
      day: "20",
    });
    expect(getDeadlineDateTile(new Date("2026-11-21T12:00:00.000Z"), now)).toEqual({
      caption: "Завтра",
      day: "21",
    });
    expect(getDeadlineDateTile(new Date("2026-12-02T12:00:00.000Z"), now)).toEqual({
      caption: "ДЕК",
      day: "02",
    });
  });

  it("calculates due dates using Moscow calendar days", () => {
    const now = new Date("2026-01-31T10:00:00.000Z");
    expect(
      getDeadlineCountdown(new Date("2026-01-31T15:00:00.000Z"), now),
    ).toEqual({ kind: "TODAY", daysRemaining: 0, label: "Сегодня" });
    expect(
      getDeadlineCountdown(new Date("2026-01-31T21:00:00.000Z"), now),
    ).toEqual({
      kind: "TOMORROW",
      daysRemaining: 1,
      label: "Завтра",
    });
    expect(
      getDeadlineCountdown(new Date("2026-01-30T20:59:59.000Z"), now),
    ).toEqual({
      kind: "OVERDUE",
      daysRemaining: -1,
      label: "Просрочено на 1 день",
    });
  });

  it("handles midnight and month boundaries consistently", () => {
    const beforeMidnight = new Date("2026-01-31T20:59:59.000Z");
    const midnightInMoscow = new Date("2026-01-31T21:00:00.000Z");
    expect(
      getDeadlineCountdown(midnightInMoscow, beforeMidnight),
    ).toMatchObject({ kind: "TOMORROW", daysRemaining: 1 });
    expect(
      getDeadlineCountdown(
        new Date("2026-02-01T15:00:00.000Z"),
        midnightInMoscow,
      ),
    ).toMatchObject({ kind: "TODAY", daysRemaining: 0 });
  });

  it("adds demo offsets across month boundaries", () => {
    expect(
      addDemoDays(1, new Date("2026-01-31T10:00:00.000Z")).toISOString(),
    ).toBe("2026-02-01T10:00:00.000Z");
    expect(
      addDemoDays(-1, new Date("2026-03-01T10:00:00.000Z")).toISOString(),
    ).toBe("2026-02-28T10:00:00.000Z");
  });

  it("uses Russian day forms for future and overdue labels", () => {
    const now = new Date("2026-01-31T10:00:00.000Z");
    expect(
      getDeadlineCountdown(new Date("2026-02-02T10:00:00.000Z"), now).label,
    ).toBe("Через 2 дня");
    expect(
      getDeadlineCountdown(new Date("2026-02-05T10:00:00.000Z"), now).label,
    ).toBe("Через 5 дней");
    expect(
      getDeadlineCountdown(new Date("2026-01-27T10:00:00.000Z"), now).label,
    ).toBe("Просрочено на 4 дня");
    expect(
      getDeadlineCountdown(new Date("2026-01-26T10:00:00.000Z"), now).label,
    ).toBe("Просрочено на 5 дней");
  });

  it("assigns urgency tones from the single countdown result", () => {
    const now = new Date("2026-01-31T10:00:00.000Z");
    expect(
      getDeadlineCountdownTone(
        getDeadlineCountdown(new Date("2026-01-31T15:00:00.000Z"), now),
      ),
    ).toBe("warning");
    expect(
      getDeadlineCountdownTone(
        getDeadlineCountdown(new Date("2026-02-02T10:00:00.000Z"), now),
      ),
    ).toBe("danger");
    expect(
      getDeadlineCountdownTone(
        getDeadlineCountdown(new Date("2026-02-05T10:00:00.000Z"), now),
      ),
    ).toBe("neutral");
  });
});

describe("nearest deadlines", () => {
  it("filters submitted items, sorts open deadlines and does not mutate input", () => {
    const deadlines = [
      {
        id: "later",
        dueAt: new Date("2026-12-03T10:00:00.000Z"),
        status: "OPEN" as const,
      },
      {
        id: "submitted",
        dueAt: new Date("2026-11-16T10:00:00.000Z"),
        status: "SUBMITTED" as const,
      },
      {
        id: "first",
        dueAt: new Date("2026-11-16T10:00:00.000Z"),
        status: "OPEN" as const,
      },
      {
        id: "second",
        dueAt: new Date("2026-11-17T10:00:00.000Z"),
        status: "OPEN" as const,
      },
    ];

    expect(getNearestDeadlines(deadlines, 2).map(({ id }) => id)).toEqual([
      "first",
      "second",
    ]);
    expect(deadlines.map(({ id }) => id)).toEqual([
      "later",
      "submitted",
      "first",
      "second",
    ]);
  });
});

describe("upcoming deadlines", () => {
  it("excludes overdue and submitted items, sorts by due date and applies the limit", () => {
    const now = new Date("2026-11-30T12:00:00.000Z");
    const deadlines = [
      {
        id: "later",
        dueAt: new Date("2026-12-03T10:00:00.000Z"),
        status: "OPEN" as const,
      },
      {
        id: "overdue",
        dueAt: new Date("2026-11-29T10:00:00.000Z"),
        status: "OPEN" as const,
      },
      {
        id: "submitted",
        dueAt: new Date("2026-12-01T10:00:00.000Z"),
        status: "SUBMITTED" as const,
      },
      {
        id: "first",
        dueAt: new Date("2026-11-30T10:00:00.000Z"),
        status: "OPEN" as const,
      },
      {
        id: "second",
        dueAt: new Date("2026-12-01T10:00:00.000Z"),
        status: "OPEN" as const,
      },
    ];

    expect(getUpcomingDeadlines(deadlines, now, 2).map(({ id }) => id)).toEqual([
      "first",
      "second",
    ]);
  });
});

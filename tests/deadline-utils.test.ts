import { describe, expect, it } from "vitest";
import {
  getDeadlineCountdown,
  getNearestDeadlines,
} from "../src/lib/deadline-utils";
import { addDemoDays } from "../src/lib/demo-date";

describe("deadline countdown", () => {
  it("calculates due dates using Moscow calendar days", () => {
    const now = new Date("2026-01-31T10:00:00.000Z");
    expect(
      getDeadlineCountdown(new Date("2026-01-31T15:00:00.000Z"), now),
    ).toEqual({ kind: "TODAY", daysRemaining: 0, label: "Сегодня" });
    expect(
      getDeadlineCountdown(new Date("2026-01-31T21:00:00.000Z"), now),
    ).toEqual({
      kind: "UPCOMING",
      daysRemaining: 1,
      label: "Осталось 1 день",
    });
    expect(
      getDeadlineCountdown(new Date("2026-01-31T09:59:59.000Z"), now),
    ).toEqual({ kind: "OVERDUE", daysRemaining: 0, label: "Просрочено" });
  });

  it("handles midnight and month boundaries consistently", () => {
    const beforeMidnight = new Date("2026-01-31T20:59:59.000Z");
    const midnightInMoscow = new Date("2026-01-31T21:00:00.000Z");
    expect(
      getDeadlineCountdown(midnightInMoscow, beforeMidnight),
    ).toMatchObject({ kind: "UPCOMING", daysRemaining: 1 });
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

import { describe, expect, it } from "vitest";
import type { RequestStatus } from "../src/generated/prisma/enums";
import {
  getRequestStatusTone,
  getTodayHeroState,
} from "../src/lib/today-view-utils";

type Lesson = {
  startTime: Date;
  endTime: Date;
  status: "PLANNED" | "RESCHEDULED" | "CANCELLED";
  subject: string;
};

function lesson(
  start: string,
  end: string,
  subject: string,
  status: Lesson["status"] = "PLANNED",
): Lesson {
  return {
    startTime: new Date(start),
    endTime: new Date(end),
    status,
    subject,
  };
}

describe("today dashboard presentation", () => {
  it("shows the running lesson and its remaining time", () => {
    const current = lesson(
      "2026-11-21T08:00:00.000Z",
      "2026-11-21T08:40:00.000Z",
      "История",
    );

    expect(
      getTodayHeroState(
        [current],
        null,
        new Date("2026-11-21T08:00:00.000Z"),
      ),
    ).toEqual({
      kind: "current",
      lesson: current,
      hasTodayLessons: true,
      countdown: "осталось 40 мин",
    });
  });

  it("skips cancelled lessons and gives the countdown to the next class", () => {
    const cancelled = lesson(
      "2026-11-21T07:00:00.000Z",
      "2026-11-21T08:00:00.000Z",
      "Отменено",
      "CANCELLED",
    );
    const next = lesson(
      "2026-11-21T09:00:00.000Z",
      "2026-11-21T10:00:00.000Z",
      "История",
      "RESCHEDULED",
    );

    expect(
      getTodayHeroState(
        [cancelled, next],
        next,
        new Date("2026-11-21T07:30:00.000Z"),
      ),
    ).toMatchObject({
      kind: "next",
      lesson: next,
      hasTodayLessons: true,
      countdown: "через 1 ч 30 мин",
    });
  });

  it("handles a weekend with no classes today and a next lesson after midnight", () => {
    const now = new Date("2026-11-21T23:59:00.000Z");
    const nearest = lesson(
      "2026-11-22T00:30:00.000Z",
      "2026-11-22T01:30:00.000Z",
      "Ближайшая пара",
    );

    expect(getTodayHeroState([], nearest, now)).toMatchObject({
      kind: "upcoming",
      lesson: nearest,
      hasTodayLessons: false,
      countdown: "через 31 мин",
    });
  });

  it("counts the wait through a weekend to Monday's first class", () => {
    const now = new Date("2026-11-21T08:00:00.000Z");
    const monday = lesson(
      "2026-11-23T08:30:00.000Z",
      "2026-11-23T10:00:00.000Z",
      "История",
    );

    expect(getTodayHeroState([], monday, now)).toMatchObject({
      kind: "upcoming",
      lesson: monday,
      hasTodayLessons: false,
      countdown: "через 48 ч 30 мин",
    });
  });

  it("calculates a next-class countdown across Moscow midnight", () => {
    const now = new Date("2026-11-21T20:45:00.000Z");
    const nextMorning = lesson(
      "2026-11-22T05:30:00.000Z",
      "2026-11-22T07:00:00.000Z",
      "История",
    );

    expect(getTodayHeroState([], nextMorning, now)).toMatchObject({
      kind: "upcoming",
      countdown: "через 8 ч 45 мин",
    });
  });

  it("shows an empty state when neither today nor the next week has a class", () => {
    expect(getTodayHeroState([], null, new Date())).toMatchObject({
      kind: "none",
      lesson: null,
      hasTodayLessons: false,
      countdown: null,
    });
  });

  it("maps all request statuses to their dashboard tones", () => {
    const statuses: RequestStatus[] = [
      "NEW",
      "IN_PROGRESS",
      "NEEDS_INFO",
      "READY",
      "REJECTED",
      "CANCELLED",
    ];
    expect(
      statuses.map(getRequestStatusTone),
    ).toEqual([
      "new",
      "inProgress",
      "needsInfo",
      "ready",
      "rejected",
      "cancelled",
    ]);
  });
});

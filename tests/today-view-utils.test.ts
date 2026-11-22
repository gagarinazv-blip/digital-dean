import { describe, expect, it } from "vitest";
import type { RequestStatus } from "../src/generated/prisma/enums";
import {
  doEventsOverlap,
  getLessonsAfterFocus,
  getRequestStatusTone,
  getTodayFocus,
  type TodayEvent,
} from "../src/lib/today-view-utils";

function event(
  id: string,
  start: string,
  end: string,
  overrides: Partial<TodayEvent> = {},
): TodayEvent {
  return {
    id,
    kind: "lesson",
    title: id,
    typeLabel: "Лекция",
    startsAt: new Date(start),
    endsAt: new Date(end),
    originalStartsAt: null,
    originalEndsAt: null,
    status: "PLANNED",
    room: "101",
    teacher: null,
    onlineUrl: null,
    scheduleHref: "/schedule",
    detailsHref: `/schedule?lesson=${id}`,
    ...overrides,
  };
}

// Понедельник, 23 ноября, по Москве: 08:30–10:00 и 10:15–11:45.
const first = event("first", "2026-11-23T05:30:00Z", "2026-11-23T07:00:00Z");
const second = event("second", "2026-11-23T07:15:00Z", "2026-11-23T08:45:00Z");
const exam = event("exam", "2026-11-23T06:00:00Z", "2026-11-23T08:00:00Z", {
  kind: "session",
  typeLabel: "Экзамен",
});
const at = (iso: string) => new Date(iso);

describe("today focus", () => {
  it("shows the running lesson until the moment it ends", () => {
    expect(getTodayFocus([second, first], at("2026-11-23T05:30:00Z"))).toMatchObject({
      state: "current",
      main: { id: "first" },
    });
    expect(getTodayFocus([first, second], at("2026-11-23T07:00:00Z"))).toMatchObject({
      state: "today",
      main: { id: "second" },
    });
  });

  it("distinguishes today from tomorrow by the Moscow calendar day", () => {
    // 23:59 22 ноября и 00:00 23 ноября по Москве.
    expect(getTodayFocus([first], at("2026-11-22T20:59:00Z")).state).toBe("upcoming");
    expect(getTodayFocus([first], at("2026-11-22T21:00:00Z")).state).toBe("today");
  });

  it("falls back to an empty state when everything has passed", () => {
    expect(getTodayFocus([], at("2026-11-23T05:00:00Z"))).toMatchObject({
      state: "none",
      main: null,
      next: null,
    });
    expect(getTodayFocus([first], at("2026-11-23T07:00:00Z")).state).toBe("none");
  });

  it("skips a cancelled lesson while another one remains today", () => {
    const cancelled = { ...first, status: "CANCELLED" as const };
    expect(getTodayFocus([cancelled, second], at("2026-11-23T05:00:00Z"))).toMatchObject({
      state: "today",
      main: { id: "second" },
    });
  });

  it("reports the cancellation when nothing else is left today", () => {
    const cancelled = { ...first, status: "CANCELLED" as const };
    const tomorrow = event("tomorrow", "2026-11-24T05:30:00Z", "2026-11-24T07:00:00Z");
    expect(getTodayFocus([tomorrow, cancelled], at("2026-11-23T05:00:00Z"))).toMatchObject({
      state: "cancelled",
      main: { id: "first" },
      isOverlapping: false,
    });
    // Накануне отмена не вытесняет реальное занятие.
    expect(getTodayFocus([tomorrow, cancelled], at("2026-11-22T05:00:00Z"))).toMatchObject({
      state: "upcoming",
      main: { id: "tomorrow" },
    });
  });

  it("keeps a rescheduled lesson as the main event", () => {
    const moved = { ...first, status: "RESCHEDULED" as const };
    expect(getTodayFocus([moved], at("2026-11-23T05:00:00Z"))).toMatchObject({
      state: "today",
      main: { id: "first", status: "RESCHEDULED" },
    });
  });

  it("marks an exam that overlaps the nearest lesson", () => {
    expect(getTodayFocus([exam, first, second], at("2026-11-22T14:00:00Z"))).toMatchObject({
      state: "upcoming",
      main: { id: "first" },
      next: { id: "exam" },
      isNextUrgent: true,
      isOverlapping: true,
    });
  });

  it("does not treat touching intervals as an overlap", () => {
    const adjacent = { ...exam, startsAt: first.endsAt };
    expect(doEventsOverlap(first, adjacent)).toBe(false);
    expect(getTodayFocus([first, adjacent], at("2026-11-23T05:00:00Z")).isOverlapping).toBe(false);
  });

  it("makes the exam the main event when it starts first or is running", () => {
    expect(getTodayFocus([exam, second], at("2026-11-23T05:00:00Z"))).toMatchObject({
      state: "today",
      main: { id: "exam" },
      next: null,
    });
    expect(getTodayFocus([first, exam], at("2026-11-23T06:30:00Z"))).toMatchObject({
      state: "current",
      main: { id: "exam" },
    });
  });

  it("shows the exam strip only within 48 hours or right after the lesson", () => {
    const late = event("late", "2026-11-25T05:30:00Z", "2026-11-25T07:00:00Z", {
      kind: "session",
    });
    const now = at("2026-11-23T05:00:00Z");
    expect(getTodayFocus([first, second, late], now).next).toBeNull();
    expect(getTodayFocus([first, second, late], at("2026-11-23T05:30:00.001Z")).next?.id).toBe("late");
    expect(getTodayFocus([first, late], now)).toMatchObject({
      next: { id: "late" },
      isNextUrgent: false,
    });
  });
});

describe("lessons after the focus", () => {
  it("excludes the focus lesson, sessions and finished lessons", () => {
    const events = [second, exam, first];
    const now = at("2026-11-22T14:00:00Z");
    const focus = getTodayFocus(events, now);
    expect(getLessonsAfterFocus(events, focus, now).map(({ id }) => id)).toEqual(["second"]);
    const later = at("2026-11-23T07:00:00Z");
    expect(
      getLessonsAfterFocus(events, { main: exam }, later).map(({ id }) => id),
    ).toEqual(["second"]);
  });
});

describe("request tones", () => {
  it("maps all request statuses to their dashboard tones", () => {
    const statuses: RequestStatus[] = [
      "NEW",
      "IN_PROGRESS",
      "NEEDS_INFO",
      "READY",
      "REJECTED",
      "CANCELLED",
    ];
    expect(statuses.map(getRequestStatusTone)).toEqual([
      "new",
      "inProgress",
      "needsInfo",
      "ready",
      "rejected",
      "cancelled",
    ]);
  });
});

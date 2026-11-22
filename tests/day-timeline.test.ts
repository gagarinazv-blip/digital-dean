import { describe, expect, it } from "vitest";
import { getDayTimeline } from "../src/lib/day-timeline";
import type { TodayEvent } from "../src/lib/today-view-utils";

function event(id: string, start: string, end: string): TodayEvent {
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
    room: null,
    teacher: null,
    onlineUrl: null,
    scheduleHref: "/schedule",
    detailsHref: "/schedule",
  };
}

const first = event("first", "2026-11-23T05:30:00Z", "2026-11-23T07:00:00Z");
const exam = event("exam", "2026-11-23T06:00:00Z", "2026-11-23T08:00:00Z");
const second = event("second", "2026-11-23T07:15:00Z", "2026-11-23T08:45:00Z");
const evening = new Date("2026-11-22T14:00:00Z");

describe("day timeline", () => {
  it("has nothing to add to a single event", () => {
    const tomorrow = event("tomorrow", "2026-11-24T05:30:00Z", "2026-11-24T07:00:00Z");
    expect(getDayTimeline([first, tomorrow], first, evening)).toBeNull();
  });

  it("puts overlapping events on separate lanes and reuses free ones", () => {
    const timeline = getDayTimeline([second, exam, first], first, evening);
    expect(timeline?.lanes).toBe(2);
    expect(
      timeline?.items.map(({ event: { id }, lane, left, width }) => [id, lane, left, width]),
    ).toEqual([
      ["first", 0, 12.5, 37.5],
      ["exam", 1, 25, 50],
      ["second", 0, 56.25, 37.5],
    ]);
  });

  it("covers whole hours and at least four of them", () => {
    const short = event("short", "2026-11-23T07:00:00Z", "2026-11-23T07:30:00Z");
    expect(getDayTimeline([first, exam, second], first, evening)?.hours).toHaveLength(5);
    expect(getDayTimeline([first, short], first, evening)?.hours).toHaveLength(5);
    expect(getDayTimeline([first, exam, second], first, evening)?.hours[0]).toEqual(
      new Date("2026-11-23T05:00:00Z"),
    );
  });

  it("splits days by Moscow midnight", () => {
    // 23:30 22 ноября и 00:30 23 ноября по Москве.
    const late = event("late", "2026-11-22T20:30:00Z", "2026-11-22T20:50:00Z");
    const early = event("early", "2026-11-22T21:30:00Z", "2026-11-22T22:00:00Z");
    expect(
      getDayTimeline([late, early, first], first, evening)?.items.map(({ event: { id } }) => id),
    ).toEqual(["early", "first"]);
  });

  it("shows the current moment only within the visible hours", () => {
    const events = [first, second];
    expect(getDayTimeline(events, first, evening)?.now).toBeNull();
    expect(getDayTimeline(events, first, new Date("2026-11-23T07:00:00Z"))?.now).toBe(50);
    expect(getDayTimeline(events, first, new Date("2026-11-23T09:00:01Z"))?.now).toBeNull();
  });
});

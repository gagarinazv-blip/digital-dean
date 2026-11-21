import { describe, expect, it } from "vitest";
import {
  buildScheduleHref,
  calculateLessonLayout,
  getMonthCalendarDays,
  parseScheduleView,
  shiftScheduleDate,
} from "../src/lib/schedule-view-utils";

describe("schedule view helpers", () => {
  it("parses supported views and falls back to the day view", () => {
    expect(parseScheduleView("week")).toBe("week");
    expect(parseScheduleView("month")).toBe("month");
    expect(parseScheduleView(["week"])).toBe("today");
    expect(parseScheduleView("unknown")).toBe("today");
  });

  it("keeps view and date state in generated navigation URLs", () => {
    expect(
      buildScheduleHref(
        "week",
        "2026-11-16",
        {
          kind: "LECTURE",
          subject: "Компьютерные сети",
          q: "Иванов",
          changed: true,
        },
        "42",
      ),
    ).toBe(
      "/schedule?view=week&date=2026-11-16&kind=LECTURE&subject=%D0%9A%D0%BE%D0%BC%D0%BF%D1%8C%D1%8E%D1%82%D0%B5%D1%80%D0%BD%D1%8B%D0%B5+%D1%81%D0%B5%D1%82%D0%B8&q=%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2&changed=1&lesson=42",
    );
  });

  it("builds a Monday-first 42-day month grid across year boundaries", () => {
    const december = getMonthCalendarDays("2026-12-15");
    expect(december).toHaveLength(42);
    expect(december[0]).toBe("2026-11-30");
    expect(december[41]).toBe("2027-01-10");

    const january = getMonthCalendarDays("2027-01-01");
    expect(january[0]).toBe("2026-12-28");
    expect(january[41]).toBe("2027-02-07");
  });

  it("shifts dates safely across month and year boundaries", () => {
    expect(shiftScheduleDate("2026-12-31", 1, "month")).toBe("2027-01-31");
    expect(shiftScheduleDate("2024-01-31", 1, "month")).toBe("2024-02-29");
    expect(shiftScheduleDate("2027-01-01", -1, "week")).toBe("2026-12-25");
    expect(shiftScheduleDate("2026-12-31", 1, "day")).toBe("2027-01-01");
  });

  it("places overlapping lessons side by side and reuses a column after a gap", () => {
    const layout = calculateLessonLayout(
      [
        { id: "first", startMinutes: 540, endMinutes: 660 },
        { id: "overlap", startMinutes: 570, endMinutes: 630 },
        { id: "next", startMinutes: 660, endMinutes: 720 },
        { id: "next-overlap", startMinutes: 690, endMinutes: 750 },
        { id: "invalid", startMinutes: Number.NaN, endMinutes: 800 },
      ],
      480,
      900,
    );

    expect(layout).toHaveLength(4);
    expect(layout.find(({ id }) => id === "first")).toMatchObject({
      top: 60,
      height: 120,
      left: 0,
      width: 50,
    });
    expect(layout.find(({ id }) => id === "overlap")).toMatchObject({
      top: 90,
      left: 50,
      width: 50,
    });
    expect(layout.find(({ id }) => id === "next")).toMatchObject({
      top: 180,
      left: 0,
      width: 50,
    });
  });
});

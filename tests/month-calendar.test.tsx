// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MonthCalendar,
  splitMonthEvents,
} from "../src/app/(campus)/schedule/month-calendar";
import type { ScheduleLessonView } from "../src/app/(campus)/schedule/schedule-view";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function lesson(
  index: number,
  overrides: Partial<ScheduleLessonView> = {},
): ScheduleLessonView {
  const hour = String(8 + index).padStart(2, "0");
  return {
    id: `${index}_2026-11-23`,
    databaseId: String(index),
    dateKey: "2026-11-23",
    subject: `Предмет ${index}`,
    kind: "LECTURE",
    kindLabel: "Лекция",
    status: "PLANNED",
    startsAtIso: `2026-11-23T${hour}:00:00.000+03:00`,
    endsAtIso: `2026-11-23T${hour}:50:00.000+03:00`,
    startsAtMinutes: (8 + index) * 60,
    endsAtMinutes: (8 + index) * 60 + 50,
    timeLabel: `${hour}:00–${hour}:50`,
    originalDateLabel: null,
    originalTimeLabel: null,
    originalRoom: null,
    room: "101",
    teacher: "Преподаватель",
    changeNote: null,
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;
const onOpenDay = vi.fn();
const onOpenLesson = vi.fn();

function render(lessons: ScheduleLessonView[]) {
  act(() =>
    root.render(
      <MonthCalendar
        dateKeys={["2026-11-23", "2026-11-24"]}
        days={[{ key: "2026-11-23", label: "понедельник", lessons }]}
        formatDay={(key) => key}
        now={new Date("2026-11-23T10:30:00+03:00")}
        onKeyDown={() => {}}
        onOpenDay={onOpenDay}
        onOpenLesson={onOpenLesson}
        openDayKey={null}
        selectedMonth="2026-11"
        todayKey="2026-11-23"
      />,
    ),
  );
}

const events = () => [
  ...container.querySelectorAll<HTMLButtonElement>("[data-lesson-id]"),
];

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("month calendar", () => {
  it("shows lessons as events with time and title instead of a count", () => {
    render([lesson(2), lesson(1)]);
    expect(events().map((event) => event.textContent)).toEqual([
      "09:00Предмет 1",
      "10:00Предмет 2",
    ]);
    expect(container.textContent).not.toMatch(/\d пар/);
  });

  it("opens the lesson from an event and the day from the cell", () => {
    render([lesson(1)]);
    act(() => events()[0].click());
    expect(onOpenLesson).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Предмет 1" }),
      expect.anything(),
    );
    expect(onOpenDay).not.toHaveBeenCalled();

    const cell = container.querySelector<HTMLElement>("[data-date='2026-11-24']")!;
    act(() => cell.click());
    act(() => cell.querySelector("button")!.click());
    expect(onOpenDay).toHaveBeenCalledTimes(2);
    expect(onOpenDay).toHaveBeenCalledWith("2026-11-24");
  });

  it("collapses a busy day into «Ещё N»", () => {
    expect(splitMonthEvents([1, 2, 3, 4])).toEqual({
      visible: [1, 2, 3, 4],
      hiddenCount: 0,
    });
    expect(splitMonthEvents([1, 2, 3, 4, 5, 6])).toEqual({
      visible: [1, 2, 3],
      hiddenCount: 3,
    });
    render([1, 2, 3, 4, 5].map((index) => lesson(index)));
    const more = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Ещё 2",
    )!;
    act(() => more.click());
    expect(onOpenDay).toHaveBeenCalledWith("2026-11-23");
  });

  it("marks past, moved, and cancelled lessons and names them fully", () => {
    render([
      lesson(1),
      lesson(3, { status: "CANCELLED" }),
      lesson(4, { status: "RESCHEDULED", kind: "SEMINAR" }),
    ]);
    const [past, cancelled, moved] = events();
    expect(past.dataset.past).toBe("true");
    expect(cancelled.dataset.status).toBe("CANCELLED");
    expect(cancelled.getAttribute("aria-label")).toContain("отменено");
    expect(moved.dataset.kind).toBe("SEMINAR");
    expect(moved.dataset.past).toBeUndefined();
    expect(
      container.querySelector("#schedule-date-2026-11-23")?.getAttribute("aria-label"),
    ).toBe("2026-11-23, 3 пары");
  });
});

// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

import { DemoNowProvider } from "../src/components/demo-now";
import { getDeadlineChip } from "../src/components/today/deadline-list";
import { NextLessonCard } from "../src/components/today/next-lesson-card";
import type { TodayEvent } from "../src/lib/today-view-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const lesson: TodayEvent = {
  id: "lesson",
  kind: "lesson",
  title: "История вымышленных цивилизаций",
  typeLabel: "Лекция",
  startsAt: new Date("2026-11-23T05:30:00Z"),
  endsAt: new Date("2026-11-23T07:00:00Z"),
  originalStartsAt: null,
  originalEndsAt: null,
  status: "PLANNED",
  room: "МО-101, ауд. 101",
  teacher: "Профессор Лира Северная",
  onlineUrl: null,
  scheduleHref: "/schedule?date=2026-11-23",
  detailsHref: "/schedule?date=2026-11-23&lesson=1",
};
const exam: TodayEvent = {
  ...lesson,
  id: "exam",
  kind: "session",
  title: "Компьютерные сети",
  typeLabel: "Экзамен",
  startsAt: new Date("2026-11-23T06:00:00Z"),
  endsAt: new Date("2026-11-23T08:00:00Z"),
  teacher: null,
  scheduleHref: "/schedule?section=session&event=1",
  detailsHref: "/schedule?section=session&event=1",
};

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.body.appendChild(document.createElement("div"));
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function render(events: TodayEvent[], now: string): Promise<string> {
  await act(async () =>
    root.render(
      <DemoNowProvider isFrozen nowIso={now}>
        <NextLessonCard events={events} serverNow={new Date(now)} />
      </DemoNowProvider>,
    ),
  );
  return container.textContent ?? "";
}

describe("next lesson card", () => {
  it("shows tomorrow's lesson with the overlapping exam strip", async () => {
    const text = await render([lesson, exam], "2026-11-22T14:30:00Z");
    expect(text).toContain("через 15 ч");
    expect(text).toContain("Завтра, 08:30–10:00");
    expect(text).toContain("Далее · Экзамен");
    expect(text).toContain("Завтра, 09:00–11:00");
    expect(text).toContain("Пересекается по времени");
    expect(text.match(/ауд\./g)).toHaveLength(1);
    expect(
      [...container.querySelectorAll("a")].map((link) => link.getAttribute("href")),
    ).toEqual([lesson.scheduleHref, lesson.detailsHref, exam.detailsHref]);
  });

  it("shows the running lesson with the remaining time and progress", async () => {
    const text = await render([lesson], "2026-11-23T06:25:00Z");
    expect(text).toContain("Идёт сейчас · осталось 35 мин");
    expect(
      container.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow"),
    ).toBe("61");
  });

  it("does not round the remaining time up to whole hours", async () => {
    expect(await render([lesson], "2026-11-23T05:55:00Z")).toContain("осталось 1 ч 5 мин");
    expect(await render([lesson], "2026-11-23T06:00:00Z")).toContain("осталось 1 ч");
  });

  it("shows a later lesson today", async () => {
    const text = await render([lesson], "2026-11-23T03:30:00Z");
    expect(text).toContain("через 2 ч");
    expect(text).toContain("Сегодня, 08:30–10:00");
    expect(container.querySelector("[role=progressbar]")).toBeNull();
  });

  it("shows the cancellation as text with the crossed out time", async () => {
    const text = await render(
      [{ ...lesson, status: "CANCELLED" }],
      "2026-11-23T03:30:00Z",
    );
    expect(text).toContain("Отменено");
    expect(container.querySelector("s")?.textContent).toBe("Сегодня, 08:30–10:00");
  });

  it("shows the previous time of a rescheduled lesson", async () => {
    const text = await render(
      [
        {
          ...lesson,
          status: "RESCHEDULED",
          originalStartsAt: new Date("2026-11-22T08:00:00Z"),
          originalEndsAt: new Date("2026-11-22T09:30:00Z"),
        },
      ],
      "2026-11-22T14:30:00Z",
    );
    expect(text).toContain("Перенесено");
    expect(container.querySelector("s")?.textContent).toBe("Сегодня, 11:00–12:30");
  });

  it("makes the exam the main event with a single link", async () => {
    const text = await render([exam], "2026-11-22T14:30:00Z");
    expect(text).toContain("Ближайшее событие сессии");
    expect(text).not.toContain("Далее");
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("offers to connect to an online lesson", async () => {
    await render(
      [{ ...lesson, room: "Онлайн", onlineUrl: "https://meet.example.test/x" }],
      "2026-11-22T14:30:00Z",
    );
    const [connect, schedule] = container.querySelectorAll("a");
    expect(connect.textContent).toContain("Подключиться");
    expect(connect.getAttribute("href")).toBe("https://meet.example.test/x");
    expect(schedule.textContent).toBe("Открыть в расписании →");
  });

  it("skips empty room and teacher", async () => {
    await render([{ ...lesson, room: "", teacher: null }], "2026-11-22T14:30:00Z");
    expect(container.querySelector("ul")).toBeNull();
  });

  it("has an empty state with one action", async () => {
    const text = await render([], "2026-11-22T14:30:00Z");
    expect(text).toContain("Ближайших занятий нет");
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });
});

describe("deadline chip", () => {
  const now = new Date("2026-11-22T14:30:00Z");
  const deadline = (dueAt: string, kind: "deadline" | "session" = "deadline") =>
    getDeadlineChip({ kind, dueAt: new Date(dueAt) }, now);

  it("names urgency once and stays silent for exams and distant dates", () => {
    expect(deadline("2026-11-22T20:59:00Z")?.label).toBe("Сегодня · срочно");
    expect(deadline("2026-11-22T21:00:00Z")?.label).toBe("Завтра · срочно");
    expect(deadline("2026-11-22T14:00:00Z")?.label).toBe("Просрочено");
    expect(deadline("2026-11-24T14:30:00Z")).toBeNull();
    expect(deadline("2026-11-23T06:00:00Z", "session")).toBeNull();
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeadlineHandIn } from "../src/components/deadline-hand-in";
import { getDeadlineAction } from "../src/lib/deadline-action";
import { generateDeadlineIcs } from "../src/lib/deadline-ics";
import type { DeadlineFormat } from "../src/generated/prisma/enums";

function render(format: DeadlineFormat, taskUrl: string | null) {
  return renderToStaticMarkup(
    createElement(DeadlineHandIn, {
      deadlineId: "d1",
      dueAt: "2026-11-24T07:00:00.000Z",
      format,
      location: "Корпус А, аудитория 214",
      showCalendar: true,
      taskUrl,
    }),
  );
}

describe("deadline action by format", () => {
  it("opens an online task safely in a new tab", () => {
    const markup = render("ONLINE", "https://example.com/task");

    expect(markup).toContain("Открыть задание");
    expect(markup).toContain('href="https://example.com/task"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).not.toContain("Добавить в календарь");
  });

  it.each([null, "", "javascript:alert(1)", "not a url"])(
    "hides the button for an online task with url %j",
    (taskUrl) => {
      expect(getDeadlineAction("ONLINE", taskUrl)).toEqual({ kind: "none" });
      expect(render("ONLINE", taskUrl)).not.toContain("<a");
    },
  );

  it.each([
    ["OFFLINE", "Место"],
    ["EXAM", "Аудитория"],
  ] as const)(
    "shows place, time, and calendar for %s even with a task url",
    (format, placeLabel) => {
      const markup = render(format, "https://example.com/task");

      expect(markup).toContain(`<dt>${placeLabel}</dt>`);
      expect(markup).toContain("Корпус А, аудитория 214");
      expect(markup).toContain("24 ноября 2026");
      expect(markup).toContain("10:00");
      expect(markup).toContain('href="/api/deadlines/d1/calendar"');
      expect(markup).not.toContain("Открыть задание");
    },
  );
});

describe("deadline calendar file", () => {
  const deadline = {
    id: "d1",
    title: "Экзамен, часть 2",
    subject: "Сети",
    topic: null,
    location: "Корпус А, 214",
    dueAt: new Date("2026-12-01T07:00:00.000Z"),
  };
  const generatedAt = new Date("2026-11-20T09:00:00.000Z");

  it("uses Moscow time, escapes text, and adds an alarm only on request", () => {
    const plain = generateDeadlineIcs(deadline, generatedAt);
    expect(plain).toContain("DTSTART;TZID=Europe/Moscow:20261201T100000");
    expect(plain).toContain("SUMMARY:Срок: Экзамен\\, часть 2");
    expect(plain).not.toContain("VALARM");
    expect(
      generateDeadlineIcs(deadline, generatedAt, { withReminder: true }),
    ).toContain("TRIGGER:-P1D");
  });
});

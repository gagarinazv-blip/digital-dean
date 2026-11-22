import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateTimeStack } from "../src/components/date-time-stack";
import { getDateStackLabels, type DateStackOptions } from "../src/lib/date-stack";

const msk = (value: string) => new Date(`${value}+03:00`);

function labels(
  value: string,
  now: string,
  options: Partial<Omit<DateStackOptions, "now">> = {},
) {
  return getDateStackLabels(msk(value), { now: msk(now), ...options });
}

function lines(...args: Parameters<typeof labels>) {
  const { day, detail } = labels(...args);
  return [day, detail];
}

describe("two-line dates", () => {
  const now = "2026-11-22T11:30:00";

  it.each([
    ["2026-11-22T14:30:00", "Сегодня", "14:30 · через 3 ч"],
    ["2026-11-22T11:55:00", "Сегодня", "11:55 · через 25 мин"],
    ["2026-11-23T09:00:00", "Завтра", "09:00 · через 22 ч"],
    ["2026-11-24T14:30:00", "Вт, 24 ноября", "14:30 · через 2 дня"],
    ["2026-11-28T10:00:00", "Сб, 28 ноября", "10:00 · через 6 дней"],
    ["2026-11-29T10:00:00", "29 ноября", "10:00 · через 7 дней"],
    ["2026-11-21T10:30:00", "Вчера", "10:30 · 1 день назад"],
    ["2026-11-22T08:30:00", "Сегодня", "08:30 · 3 ч назад"],
    ["2026-11-20T10:30:00", "Пт, 20 ноября", "10:30 · 2 дня назад"],
  ])("formats %s", (value, day, detail) => {
    expect(lines(value, now)).toEqual([day, detail]);
  });

  it("handles the exact moment and the last minute", () => {
    expect(lines(now, now)).toEqual(["Сегодня", "11:30 · сейчас"]);
    expect(lines("2026-11-22T11:30:30", now)[1]).toBe("11:30 · через 1 мин");
    expect(lines("2026-11-22T12:29:30", now)[1]).toBe("12:29 · через 1 ч");
  });

  it("switches the day at Moscow midnight, not UTC midnight", () => {
    expect(lines("2026-11-23T00:30:00", "2026-11-22T23:50:00")).toEqual([
      "Завтра",
      "00:30 · через 40 мин",
    ]);
    expect(lines("2026-11-22T23:50:00", "2026-11-23T00:10:00")).toEqual([
      "Вчера",
      "23:50 · 20 мин назад",
    ]);
    // 00:30 МСК — это ещё предыдущие сутки по UTC.
    expect(lines("2026-11-22T01:00:00", "2026-11-22T00:30:00")[0]).toBe("Сегодня");
  });

  it("counts calendar days across a month and a year boundary", () => {
    expect(lines("2026-12-01T10:00:00", "2026-11-30T09:00:00")[0]).toBe("Завтра");
    expect(lines("2027-01-01T00:15:00", "2026-12-31T23:45:00")).toEqual([
      "Завтра",
      "00:15 · через 30 мин",
    ]);
    expect(lines("2027-01-14T10:00:00", "2026-12-31T10:00:00")[0]).toBe(
      "14 января 2027",
    );
    expect(lines("2025-12-31T10:00:00", "2026-11-22T10:00:00")).toEqual([
      "31 декабря 2025",
      "10:00",
    ]);
  });

  it("describes a class running through midnight", () => {
    const end = msk("2026-11-23T01:00:00");
    const start = "2026-11-22T23:30:00";
    expect(lines(start, "2026-11-22T23:00:00", { end })).toEqual([
      "Сегодня",
      "23:30–01:00 · через 30 мин",
    ]);
    expect(lines(start, "2026-11-23T00:20:00", { end })).toEqual([
      "Вчера",
      "23:30–01:00 · идёт сейчас",
    ]);
    expect(lines(start, "2026-11-23T01:25:00", { end })[1]).toBe(
      "23:30–01:00 · 25 мин назад",
    );
  });

  it("shows all-day dates without time", () => {
    const allDay = { allDay: true } as const;
    expect(lines("2026-11-24T00:00:00", now, allDay)).toEqual([
      "Вт, 24 ноября",
      "через 2 дня",
    ]);
    expect(lines("2026-11-22T00:00:00", now, allDay)).toEqual(["Сегодня", null]);
    expect(labels("2026-11-24T00:00:00", now, allDay).dateTime).toBe("2026-11-24");
  });

  it("marks overdue and urgent deadlines with text", () => {
    const deadline = { kind: "deadline" } as const;
    expect(labels("2026-11-22T08:30:00", now, deadline)).toMatchObject({
      detail: "08:30 · просрочено на 3 ч",
      urgency: "overdue",
    });
    expect(labels("2026-11-19T08:30:00", now, deadline).detail).toBe(
      "08:30 · просрочено на 3 дня",
    );
    expect(labels("2026-11-24T11:29:59", now, deadline)).toMatchObject({
      urgency: "urgent",
      urgencyLabel: "срочно",
    });
    expect(labels("2026-11-24T11:30:00", now, deadline).urgency).toBeNull();
    expect(
      labels("2026-11-22T08:30:00", now, { ...deadline, done: true }),
    ).toMatchObject({ urgency: null, detail: "08:30 · 3 ч назад" });
  });

  it("renders a semantic time element with two lines", () => {
    const markup = renderToStaticMarkup(
      createElement(DateTimeStack, {
        value: msk("2026-11-22T14:30:00"),
        now: msk(now),
        kind: "deadline",
      }),
    );
    expect(markup).toMatch(/datetime="2026-11-22T11:30:00.000Z"/i);
    expect(markup).toContain("Сегодня");
    expect(markup).toContain("срочно");
    expect(markup).toContain("14:30 · через 3 ч");
  });

  it("falls back to absolute lines without a current time", () => {
    expect(
      getDateStackLabels(msk("2026-11-22T14:30:00"), { now: null }),
    ).toMatchObject({ day: "22 ноября 2026", detail: "14:30" });
  });
});

import { describe, expect, it } from "vitest";
import {
  canRemindOneDayBefore,
  getDeadlineRemaining,
} from "../src/lib/deadline-utils";

// 20 ноября 2026, 12:00 по Москве.
const now = new Date("2026-11-20T09:00:00.000Z");
const remaining = (dueAt: string, at = now) =>
  getDeadlineRemaining(new Date(dueAt), at);

describe("deadline remaining label", () => {
  it("shows the exact time for a deadline due today", () => {
    expect(remaining("2026-11-20T20:59:00.000Z").label).toBe("Сегодня до 23:59");
    expect(
      getDeadlineRemaining(new Date("2026-11-20T12:00:00.000Z"), now, "EXAM")
        .label,
    ).toBe("Сегодня в 15:00");
  });

  it("distinguishes a deadline that already passed today", () => {
    expect(remaining("2026-11-20T08:59:00.000Z")).toMatchObject({
      label: "Срок истёк сегодня в 11:59",
      urgency: "overdue",
    });
  });

  it.each([
    ["2026-11-21T20:59:00.000Z", "Завтра"],
    ["2026-11-22T20:59:00.000Z", "Осталось 2 дня"],
    ["2026-11-25T20:59:00.000Z", "Осталось 5 дней"],
    ["2026-12-01T20:59:00.000Z", "Осталось 11 дней"],
    ["2026-12-11T20:59:00.000Z", "Остался 21 день"],
    ["2026-12-20T20:59:00.000Z", "Осталось 30 дней"],
    ["2026-11-19T20:59:00.000Z", "Просрочено на 1 день"],
    ["2026-11-18T20:59:00.000Z", "Просрочено на 2 дня"],
  ])("labels %s as %s", (dueAt, label) => {
    expect(remaining(dueAt).label).toBe(label);
  });

  it("changes the day at Moscow midnight, not at UTC midnight", () => {
    const beforeMidnight = new Date("2026-11-20T20:59:59.000Z");
    const afterMidnight = new Date("2026-11-20T21:00:00.000Z");
    const dueAt = "2026-11-21T20:59:00.000Z";

    expect(remaining(dueAt, beforeMidnight).label).toBe("Завтра");
    expect(remaining(dueAt, afterMidnight).label).toBe("Сегодня до 23:59");
    expect(remaining("2026-11-20T20:59:00.000Z", afterMidnight).label).toBe(
      "Просрочено на 1 день",
    );
  });

  it("crosses month, leap day, and year boundaries", () => {
    expect(
      remaining(
        "2026-12-02T09:00:00.000Z",
        new Date("2026-11-30T09:00:00.000Z"),
      ).label,
    ).toBe("Осталось 2 дня");
    expect(
      remaining(
        "2027-01-01T09:00:00.000Z",
        new Date("2026-12-31T09:00:00.000Z"),
      ).label,
    ).toBe("Завтра");
    expect(
      remaining(
        "2028-03-01T09:00:00.000Z",
        new Date("2028-02-28T09:00:00.000Z"),
      ).label,
    ).toBe("Осталось 2 дня");
  });
});

describe("deadline urgency", () => {
  it.each([
    ["2026-11-20T08:59:59.000Z", "overdue", "Просрочено"],
    ["2026-11-22T08:59:59.000Z", "urgent", "Срочно"],
    ["2026-11-22T09:00:00.000Z", "soon", "Скоро срок"],
    ["2026-11-27T20:59:00.000Z", "soon", "Скоро срок"],
    ["2026-11-27T21:00:00.000Z", "calm", "Время есть"],
  ])("marks %s as %s with a text label", (dueAt, urgency, urgencyLabel) => {
    expect(remaining(dueAt)).toMatchObject({ urgency, urgencyLabel });
  });

  it("offers a one-day reminder only when more than a day is left", () => {
    expect(
      canRemindOneDayBefore(new Date("2026-11-21T09:00:01.000Z"), now),
    ).toBe(true);
    expect(
      canRemindOneDayBefore(new Date("2026-11-21T09:00:00.000Z"), now),
    ).toBe(false);
  });
});

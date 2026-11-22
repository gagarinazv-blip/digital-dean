import { describe, expect, it } from "vitest";
import {
  buildDeadlineSeedData,
  getDeadlineSeedSyncPlan,
} from "../prisma/deadline-seed-data";

describe("deadline demo fixtures", () => {
  it("uses relative dates and includes personal work for both main students", () => {
    const reference = new Date("2026-11-30T12:00:00.000Z");
    const deadlines = buildDeadlineSeedData(reference);
    const secondRun = buildDeadlineSeedData(reference);

    expect(deadlines).toHaveLength(12);
    expect(secondRun).toEqual(deadlines);
    expect(new Set(deadlines.map(({ login }) => login))).toEqual(
      new Set(["student.alpha", "student.beta"]),
    );
    expect(
      deadlines.find(({ title }) => title === "Лабораторная работа № 3")
        ?.dueAt.toISOString(),
    ).toBe("2026-12-02T20:59:00.000Z");
    expect(
      deadlines.find(({ login, daysFromDemoDate }) =>
        login === "student.beta" && daysFromDemoDate === -1
      )?.dueAt.toISOString(),
    ).toBe("2026-11-29T20:59:00.000Z");
    for (const [login, upcoming] of [
      ["student.alpha", 7],
      ["student.beta", 3],
    ] as const) {
      const studentDeadlines = deadlines.filter(
        (deadline) => deadline.login === login,
      );
      expect(
        studentDeadlines.filter(({ daysFromDemoDate }) => daysFromDemoDate >= 0),
      ).toHaveLength(upcoming);
      expect(
        studentDeadlines.filter(({ daysFromDemoDate }) => daysFromDemoDate < 0),
      ).toHaveLength(1);
    }
  });

  it("covers every format, due-date state, and material state", () => {
    const alpha = buildDeadlineSeedData(
      new Date("2026-11-30T12:00:00.000Z"),
    ).filter(({ login }) => login === "student.alpha");

    expect(new Set(alpha.map(({ format }) => format))).toEqual(
      new Set(["ONLINE", "OFFLINE", "EXAM"]),
    );
    expect(alpha.map(({ daysFromDemoDate }) => daysFromDemoDate)).toEqual(
      expect.arrayContaining([-1, 0, 1, 7, 30]),
    );
    expect(alpha.some(({ materials }) => materials?.length)).toBe(true);
    expect(alpha.some(({ materials }) => !materials?.length)).toBe(true);
    expect(
      alpha.some(({ format, taskUrl }) => format === "ONLINE" && !taskUrl),
    ).toBe(true);
    for (const fixture of alpha) {
      if (fixture.format !== "ONLINE") expect(fixture.location).toBeTruthy();
    }
  });

  it("reuses existing records, updates only open ones and creates only when absent", () => {
    expect(
      getDeadlineSeedSyncPlan([
        { id: "submitted", status: "SUBMITTED" },
        { id: "open-first", status: "OPEN" },
        { id: "open-duplicate", status: "OPEN" },
      ]),
    ).toEqual({
      deadlineId: "open-first",
      openDeadlineIds: ["open-first", "open-duplicate"],
    });
    expect(
      getDeadlineSeedSyncPlan([{ id: "submitted", status: "SUBMITTED" }]),
    ).toEqual({ deadlineId: "submitted", openDeadlineIds: [] });
    expect(getDeadlineSeedSyncPlan([])).toEqual({
      deadlineId: null,
      openDeadlineIds: [],
    });
  });
});

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

    expect(deadlines).toHaveLength(8);
    expect(secondRun).toEqual(deadlines);
    expect(new Set(deadlines.map(({ login }) => login))).toEqual(
      new Set(["student.alpha", "student.beta"]),
    );
    expect(
      deadlines.find(({ title }) => title === "Лабораторная работа № 3")
        ?.dueAt.toISOString(),
    ).toBe("2026-12-02T12:00:00.000Z");
    expect(
      deadlines.find(({ login, daysFromDemoDate }) =>
        login === "student.beta" && daysFromDemoDate === -1
      )?.dueAt.toISOString(),
    ).toBe("2026-11-29T12:00:00.000Z");
    for (const login of ["student.alpha", "student.beta"]) {
      const studentDeadlines = deadlines.filter(
        (deadline) => deadline.login === login,
      );
      expect(
        studentDeadlines.filter(({ daysFromDemoDate }) => daysFromDemoDate >= 0),
      ).toHaveLength(3);
      expect(
        studentDeadlines.filter(({ daysFromDemoDate }) => daysFromDemoDate < 0),
      ).toHaveLength(1);
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

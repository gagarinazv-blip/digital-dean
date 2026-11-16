import { describe, expect, it } from "vitest";
import { buildDeadlineSeedData } from "../prisma/deadline-seed-data";

describe("deadline demo fixtures", () => {
  it("uses relative dates and includes personal work for both main students", () => {
    const reference = new Date("2026-11-30T12:00:00.000Z");
    const deadlines = buildDeadlineSeedData(reference);

    expect(deadlines).toHaveLength(8);
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
  });
});

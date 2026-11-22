import { describe, expect, it } from "vitest";
import { getDeadlineWeight } from "../src/lib/deadline-weight";
import { getTaskGroup, groupTasks } from "../src/lib/task-groups";

const now = new Date("2026-11-22T14:00:00Z");
const task = (
  id: string,
  dueAt: string,
  status: "OPEN" | "SUBMITTED" = "OPEN",
) => ({ id, dueAt: new Date(dueAt), status });

describe("task groups", () => {
  it("uses Moscow calendar days for the week boundary", () => {
    expect(getTaskGroup(new Date("2026-11-22T13:59:59Z"), now)).toBe("overdue");
    expect(getTaskGroup(now, now)).toBe("week");
    // 23:59 28 ноября и 00:00 29 ноября по Москве.
    expect(getTaskGroup(new Date("2026-11-28T20:59:00Z"), now)).toBe("week");
    expect(getTaskGroup(new Date("2026-11-28T21:00:00Z"), now)).toBe("later");
  });

  it("orders actual tasks and keeps submitted ones apart", () => {
    const { groups, submitted } = groupTasks(
      [
        task("later", "2026-12-10T10:00:00Z"),
        task("done-old", "2026-11-01T10:00:00Z", "SUBMITTED"),
        task("soon", "2026-11-23T10:00:00Z"),
        task("overdue", "2026-11-20T10:00:00Z"),
        task("sooner", "2026-11-22T20:00:00Z"),
        task("done-new", "2026-11-21T10:00:00Z", "SUBMITTED"),
      ],
      now,
    );
    expect(groups.map(({ key, tasks }) => [key, tasks.map(({ id }) => id)])).toEqual([
      ["overdue", ["overdue"]],
      ["week", ["sooner", "soon"]],
      ["later", ["later"]],
    ]);
    expect(submitted.map(({ id }) => id)).toEqual(["done-new", "done-old"]);
  });

  it("skips empty groups", () => {
    expect(groupTasks([], now)).toEqual({ groups: [], submitted: [] });
  });
});

describe("deadline weight", () => {
  const weight = (
    disciplineId: string | null,
    title: string,
    format: "ONLINE" | "OFFLINE" | "EXAM" = "ONLINE",
  ) => getDeadlineWeight({ disciplineId, title, format });

  it("takes the numbered component when the formula has one", () => {
    expect(weight("pi31-s5-networks", "Контрольная работа № 2")).toMatchObject({
      percent: 20,
      component: "Контрольная работа 2",
      isShared: false,
    });
  });

  it("marks a work that is only a part of the component", () => {
    expect(weight("pi31-s5-networks", "Лабораторная работа № 3")).toMatchObject({
      percent: 30,
      component: "Лабораторные работы",
      isShared: true,
    });
    expect(weight("pi31-s5-algorithms", "Контрольная работа № 2")).toMatchObject({
      percent: 20,
      isShared: true,
    });
  });

  it("uses the exam component for an exam", () => {
    expect(weight("pi31-s5-networks", "Устная часть", "EXAM")).toMatchObject({
      percent: 20,
      component: "Экзамен",
      isShared: false,
    });
  });

  it("does not guess", () => {
    expect(weight("pi31-s5-databases", "Схема базы данных")).toBeNull();
    expect(weight("pi31-s5-networks", "Контрольная работа № 9")).toBeNull();
    expect(weight("pi31-s5-ux", "Контрольная работа № 1")).toBeNull();
    expect(weight(null, "Экзамен", "EXAM")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { buildTargetScheduleSeed } from "../prisma/schedule-seed-data";

describe("target group schedule seed", () => {
  const now = new Date("2026-11-14T18:00:00.000Z");

  it("creates distinct schedules for two weeks before and after the current week", () => {
    const rows = buildTargetScheduleSeed(now);
    const alphaRows = rows.filter((row) => row.login === "student.alpha");
    const betaRows = rows.filter((row) => row.login === "student.beta");

    expect(alphaRows).toHaveLength(70);
    expect(betaRows).toHaveLength(60);
    expect(
      new Set(rows.map((row) => row.date.toISOString().slice(0, 10))),
    ).toEqual(
      new Set([
        "2026-10-26",
        "2026-10-27",
        "2026-10-28",
        "2026-10-29",
        "2026-10-30",
        "2026-11-02",
        "2026-11-03",
        "2026-11-04",
        "2026-11-05",
        "2026-11-06",
        "2026-11-09",
        "2026-11-10",
        "2026-11-11",
        "2026-11-12",
        "2026-11-13",
        "2026-11-16",
        "2026-11-17",
        "2026-11-18",
        "2026-11-19",
        "2026-11-20",
        "2026-11-23",
        "2026-11-24",
        "2026-11-25",
        "2026-11-26",
        "2026-11-27",
      ]),
    );

    for (const row of rows) {
      expect(row.date.getUTCDay()).toBeGreaterThanOrEqual(1);
      expect(row.date.getUTCDay()).toBeLessThanOrEqual(5);
    }

    for (const login of ["student.alpha", "student.beta"] as const) {
      const studentRows = rows.filter((row) => row.login === login);
      const scheduleKeys = studentRows.map(
        (row) =>
          `${row.date.toISOString().slice(0, 10)}:${row.startTime}`,
      );
      expect(new Set(scheduleKeys).size).toBe(scheduleKeys.length);
    }

    for (const weekStart of [
      "2026-10-26",
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
    ]) {
      for (let weekday = 0; weekday < 5; weekday += 1) {
        const date = new Date(`${weekStart}T00:00:00.000Z`);
        date.setUTCDate(date.getUTCDate() + weekday);
        const dateKey = date.toISOString().slice(0, 10);
        const alphaDay = alphaRows.filter(
          (row) => row.date.toISOString().slice(0, 10) === dateKey,
        );
        const betaDay = betaRows.filter(
          (row) => row.date.toISOString().slice(0, 10) === dateKey,
        );

        expect(alphaDay.length).toBeGreaterThanOrEqual(2);
        expect(alphaDay.length).toBeLessThanOrEqual(4);
        if (weekday === 2) {
          expect(betaDay).toHaveLength(0);
        } else {
          expect(betaDay.length).toBeGreaterThanOrEqual(2);
          expect(betaDay.length).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it("includes the requested transfers and cancellation for alpha", () => {
    const alphaRows = buildTargetScheduleSeed(now).filter(
      (row) => row.login === "student.alpha",
    );
    const timeAndRoomMove = alphaRows.find(
      (row) => row.changeNote === "Преподаватель на конференции",
    );
    const roomOnlyMove = alphaRows.find(
      (row) => row.changeNote === "Аудитория изменена.",
    );
    const cancelled = alphaRows.find(
      (row) =>
        row.changeNote ===
        "Занятие отменено, материалы в чате группы",
    );

    expect(timeAndRoomMove).toMatchObject({
      status: "RESCHEDULED",
      startTime: "08:00",
      endTime: "09:30",
      originalStartTime: "08:30",
      originalEndTime: "10:00",
      room: "МО-101, ауд. 108",
      originalRoom: "МО-101, ауд. 101",
    });
    expect(roomOnlyMove).toMatchObject({
      status: "RESCHEDULED",
      room: "МО-101, ауд. 109",
      originalRoom: "МО-101, ауд. 101",
    });
    expect(roomOnlyMove?.originalStartTime).toBe(roomOnlyMove?.startTime);
    expect(roomOnlyMove?.originalEndTime).toBe(roomOnlyMove?.endTime);
    expect(cancelled).toMatchObject({ status: "CANCELLED" });
  });

  it("includes a transfer and cancellation for beta and keeps groups distinct", () => {
    const rows = buildTargetScheduleSeed(now);
    const alphaRows = rows.filter((row) => row.login === "student.alpha");
    const betaRows = rows.filter((row) => row.login === "student.beta");
    const alphaSubjects = new Set(alphaRows.map((row) => row.subjectIndex));
    const betaSubjects = new Set(betaRows.map((row) => row.subjectIndex));

    expect(betaRows.some((row) => row.status === "RESCHEDULED")).toBe(true);
    expect(betaRows.some((row) => row.status === "CANCELLED")).toBe(true);
    expect([...alphaSubjects].some((index) => betaSubjects.has(index))).toBe(
      false,
    );

    const seedKeys = rows.map(
      (row) =>
        `${row.login}:${row.date.toISOString().slice(0, 10)}:${row.startTime}:${row.subjectIndex}`,
    );
    expect(new Set(seedKeys).size).toBe(seedKeys.length);
  });

  it("generates the same rows on repeated seed runs for the same demo date", () => {
    expect(buildTargetScheduleSeed(now)).toEqual(buildTargetScheduleSeed(now));
  });

  it("keeps schedule text free of the retired seed marker", () => {
    const visibleText = buildTargetScheduleSeed(now)
      .flatMap((row) =>
        Object.values(row).filter(
          (value): value is string => typeof value === "string",
        ),
      )
      .join(" ");

    expect(visibleText).not.toContain("[seed-test]");
  });
});

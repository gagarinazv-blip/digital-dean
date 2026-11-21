import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStudentMock, scheduleFindManyMock } = vi.hoisted(() => ({
  requireStudentMock: vi.fn(),
  scheduleFindManyMock: vi.fn(),
}));

vi.mock("@/lib/student", () => ({
  requireStudent: requireStudentMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    scheduleItem: { findMany: scheduleFindManyMock },
  })),
}));

import {
  getNextScheduleLesson,
  getScheduleForStudent,
  groupScheduleLessonsByDay,
  type ScheduleLesson,
} from "../src/lib/schedule-data";

const student = {
  id: 17,
  group: { id: 41, name: "МО-101" },
};

beforeEach(() => {
  vi.clearAllMocks();
  requireStudentMock.mockResolvedValue(student);
});

describe("getScheduleForStudent", () => {
  it("uses the current student's group and expands UTC and legacy weekly lessons", async () => {
    scheduleFindManyMock.mockResolvedValue([
      {
        id: 1,
        date: null,
        weekday: null,
        startTime: new Date("1970-01-01T09:30:00.000Z"),
        endTime: new Date("1970-01-01T11:00:00.000Z"),
        startsAt: new Date("2026-11-14T08:30:00.000Z"),
        endsAt: new Date("2026-11-14T10:00:00.000Z"),
        originalStartsAt: new Date("2026-11-14T07:30:00.000Z"),
        originalEndsAt: new Date("2026-11-14T09:00:00.000Z"),
        originalRoom: "А-12",
        kind: "SEMINAR",
        status: "RESCHEDULED",
        room: "Б-24",
        teacher: "Преподаватель 1",
        changeNote: "Занятие перенесено.",
        subject: { name: "Семинар" },
      },
      {
        id: 2,
        date: null,
        weekday: "MONDAY",
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T10:30:00.000Z"),
        startsAt: null,
        endsAt: null,
        originalStartsAt: null,
        originalEndsAt: null,
        originalRoom: null,
        kind: "LECTURE",
        status: "PLANNED",
        room: "А-10",
        teacher: "Преподаватель 2",
        changeNote: null,
        subject: { name: "Лекция по расписанию" },
      },
      {
        id: 3,
        date: new Date("2026-11-15T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T10:00:00.000Z"),
        endTime: new Date("1970-01-01T11:30:00.000Z"),
        startsAt: null,
        endsAt: null,
        originalStartsAt: null,
        originalEndsAt: null,
        originalRoom: null,
        kind: "PRACTICE",
        status: "PLANNED",
        room: "В-18",
        teacher: "Преподаватель 3",
        changeNote: null,
        subject: { name: "Практика по расписанию" },
      },
      {
        id: 4,
        date: null,
        weekday: null,
        startTime: new Date("1970-01-01T12:00:00.000Z"),
        endTime: new Date("1970-01-01T13:30:00.000Z"),
        startsAt: new Date("2026-11-15T09:00:00.000Z"),
        endsAt: new Date("2026-11-15T10:30:00.000Z"),
        originalStartsAt: null,
        originalEndsAt: null,
        originalRoom: null,
        kind: "LECTURE",
        status: "CANCELLED",
        room: "А-20",
        teacher: "Преподаватель 4",
        changeNote: "Занятие отменено.",
        subject: { name: "Отменённая лекция" },
      },
    ]);

    const data = await getScheduleForStudent("week", {
      now: new Date("2026-11-14T18:00:00.000Z"),
    });

    expect(requireStudentMock).toHaveBeenCalledOnce();
    expect(data.groupName).toBe("МО-101");
    expect(data.lessons.map((lesson) => lesson.subject)).toEqual([
      "Лекция по расписанию",
      "Семинар",
      "Практика по расписанию",
      "Отменённая лекция",
    ]);
    expect(data.lessons[0].startsAt.toISOString()).toBe(
      "2026-11-09T06:00:00.000Z",
    );
    expect(data.lessons[1]).toEqual(
      expect.objectContaining({
        status: "RESCHEDULED",
        originalStartsAt: new Date("2026-11-14T07:30:00.000Z"),
        originalRoom: "А-12",
      }),
    );
    expect(data.lessons[3].status).toBe("CANCELLED");
    expect(scheduleFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          groupId: student.group.id,
          OR: expect.arrayContaining([
            {
              startsAt: {
                gte: new Date("2026-11-08T21:00:00.000Z"),
                lt: new Date("2026-11-15T21:00:00.000Z"),
              },
            },
          ]),
        }),
      }),
    );
  });

  it("uses the requested Moscow day only outside production", async () => {
    scheduleFindManyMock.mockResolvedValue([]);

    const data = await getScheduleForStudent("today", {
      date: "2026-11-15",
      now: new Date("2026-11-14T18:00:00.000Z"),
    });

    expect(data.todayKey).toBe("2026-11-15");
    expect(data.referenceNow.toISOString()).toBe("2026-11-15T18:00:00.000Z");
    expect(scheduleFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              startsAt: {
                gte: new Date("2026-11-14T21:00:00.000Z"),
                lt: new Date("2026-11-15T21:00:00.000Z"),
              },
            },
          ]),
        }),
      }),
    );
  });

  it("loads the full Moscow month grid without widening the student's group scope", async () => {
    scheduleFindManyMock.mockResolvedValue([]);

    const data = await getScheduleForStudent("month", {
      date: "2026-11-16",
      now: new Date("2026-11-14T18:00:00.000Z"),
    });

    expect(data.startDate.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(data.endDate.toISOString()).toBe("2026-12-07T00:00:00.000Z");
    expect(scheduleFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          groupId: student.group.id,
          OR: expect.arrayContaining([
            {
              startsAt: {
                gte: new Date("2026-10-25T21:00:00.000Z"),
                lt: new Date("2026-12-06T21:00:00.000Z"),
              },
            },
          ]),
        }),
      }),
    );
  });

  it("uses each session's current student group instead of a shared group", async () => {
    scheduleFindManyMock.mockResolvedValue([]);
    requireStudentMock
      .mockResolvedValueOnce(student)
      .mockResolvedValueOnce({
        ...student,
        id: 18,
        group: { id: 52, name: "ЗР-203" },
      });

    await getScheduleForStudent("week", {
      now: new Date("2026-11-14T18:00:00.000Z"),
    });
    await getScheduleForStudent("week", {
      now: new Date("2026-11-14T18:00:00.000Z"),
    });

    expect(
      scheduleFindManyMock.mock.calls.map(
        ([query]) => query.where.groupId,
      ),
    ).toEqual([41, 52]);
  });

  it("ignores the requested date in production", async () => {
    scheduleFindManyMock.mockResolvedValue([]);
    vi.stubEnv("NODE_ENV", "production");

    try {
      const data = await getScheduleForStudent("today", {
        date: "not-a-date",
        now: new Date("2026-11-14T18:00:00.000Z"),
      });

      expect(data.todayKey).toBe("2026-11-14");
      expect(scheduleFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                startsAt: {
                  gte: new Date("2026-11-13T21:00:00.000Z"),
                  lt: new Date("2026-11-14T21:00:00.000Z"),
                },
              },
            ]),
          }),
        }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses a validated notification date override in production", async () => {
    scheduleFindManyMock.mockResolvedValue([]);
    vi.stubEnv("NODE_ENV", "production");

    try {
      const data = await getScheduleForStudent("week", {
        date: "2026-12-01",
        now: new Date("2026-11-16T18:00:00.000Z"),
        allowDateOverride: true,
      });

      expect(data.todayKey).toBe("2026-12-01");
      expect(scheduleFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                startsAt: {
                  gte: new Date("2026-11-29T21:00:00.000Z"),
                  lt: new Date("2026-12-06T21:00:00.000Z"),
                },
              },
            ]),
          }),
        }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects malformed development date overrides", async () => {
    await expect(
      getScheduleForStudent("today", { date: "2026-02-31" }),
    ).rejects.toThrow("Параметр date содержит некорректную дату.");
    expect(requireStudentMock).toHaveBeenCalledOnce();
  });
});

describe("schedule helper functions", () => {
  const lesson = (
    id: string,
    startsAt: string,
    status: ScheduleLesson["status"],
    originalStartsAt: string | null = null,
  ): ScheduleLesson => ({
    id,
    startsAt: new Date(startsAt),
    endsAt: new Date(new Date(startsAt).getTime() + 60 * 60 * 1000),
    originalStartsAt: originalStartsAt ? new Date(originalStartsAt) : null,
    originalEndsAt: null,
    originalRoom: null,
    kind: "LECTURE",
    status,
    room: "А-10",
    teacher: "Преподаватель",
    changeNote: null,
    subject: id,
  });

  it("groups lessons by their Moscow calendar date", () => {
    const groups = groupScheduleLessonsByDay([
      lesson("next-day", "2026-11-14T21:15:00.000Z", "PLANNED"),
      lesson("today", "2026-11-14T20:45:00.000Z", "PLANNED"),
    ]);

    expect(groups.map(({ dateKey }) => dateKey)).toEqual([
      "2026-11-14",
      "2026-11-15",
    ]);
  });

  it("skips cancelled lessons and sorts rescheduled lessons by their current time", () => {
    const lessons = [
      lesson(
        "moved",
        "2026-11-14T09:00:00.000Z",
        "RESCHEDULED",
        "2026-11-14T08:00:00.000Z",
      ),
      lesson("cancelled", "2026-11-14T08:30:00.000Z", "CANCELLED"),
      lesson("planned", "2026-11-14T10:00:00.000Z", "PLANNED"),
    ];

    expect(
      getNextScheduleLesson(lessons, new Date("2026-11-14T08:00:00.000Z"))
        ?.id,
    ).toBe("moved");
    expect(
      getNextScheduleLesson(lessons, new Date("2026-11-14T09:30:00.000Z"))
        ?.id,
    ).toBe("planned");
    expect(
      getNextScheduleLesson(
        [lesson("cancelled", "2026-11-14T08:30:00.000Z", "CANCELLED")],
        new Date("2026-11-14T08:00:00.000Z"),
      ),
    ).toBeNull();
  });
});

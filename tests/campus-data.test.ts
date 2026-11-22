import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStudentMock, prismaMock } = vi.hoisted(() => ({
  requireStudentMock: vi.fn(),
  prismaMock: {
    scheduleItem: { findMany: vi.fn() },
    notification: { findMany: vi.fn(), count: vi.fn() },
    deadline: { findMany: vi.fn() },
    request: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/student", () => ({
  requireStudent: requireStudentMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => prismaMock),
}));

import { getCampusTodayData } from "../src/lib/campus-data";

const student = {
  id: 17,
  fullName: "Вымышленная Студентка",
  faculty: "Факультет демонстрационных данных",
  direction: "Учебное направление",
  course: 2,
  group: { id: 41, name: "DEMO-ALPHA" },
};

function scheduleLesson(id: number, date: string, subject: string) {
  return {
    id,
    date: new Date(`${date}T00:00:00.000Z`),
    weekday: null,
    startTime: new Date("1970-01-01T08:30:00.000Z"),
    endTime: new Date("1970-01-01T10:00:00.000Z"),
    startsAt: new Date(`${date}T05:30:00.000Z`),
    endsAt: new Date(`${date}T07:00:00.000Z`),
    originalStartsAt: null,
    originalEndsAt: null,
    originalRoom: null,
    kind: "LECTURE" as const,
    room: "101",
    teacher: "Преподаватель",
    status: "PLANNED" as const,
    changeNote: null,
    subject: { name: subject },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireStudentMock.mockResolvedValue(student);
  prismaMock.scheduleItem.findMany.mockResolvedValue([]);
  prismaMock.notification.findMany.mockResolvedValue([]);
  prismaMock.notification.count.mockResolvedValue(0);
  prismaMock.deadline.findMany.mockResolvedValue([]);
  prismaMock.request.findMany.mockResolvedValue([]);
});

describe("getCampusTodayData", () => {
  it("returns up to three upcoming lessons when today's schedule is empty", async () => {
    prismaMock.scheduleItem.findMany.mockResolvedValue([
      scheduleLesson(51, "2026-11-15", "Занятие 1"),
      scheduleLesson(52, "2026-11-16", "Занятие 2"),
      scheduleLesson(53, "2026-11-17", "Занятие 3"),
    ]);

    const data = await getCampusTodayData(
      new Date("2026-11-14T12:00:00.000Z"),
    );

    expect(data.todaySchedule).toHaveLength(0);
    expect(data.nearbyLessons.map((lesson) => lesson.subject.name)).toEqual([
      "Занятие 1",
      "Занятие 2",
      "Занятие 3",
    ]);
  });

  it("scopes every student-specific query to the authenticated student and group", async () => {
    const now = new Date("2026-11-14T12:00:00.000Z");
    await getCampusTodayData(now);

    expect(requireStudentMock).toHaveBeenCalledOnce();
    expect(prismaMock.scheduleItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ groupId: student.group.id }),
      }),
    );
    expect(prismaMock.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: student.id },
        take: 1,
      }),
    );

    const [deadlineQuery] = prismaMock.deadline.findMany.mock.calls.map(
      ([query]) => query,
    );
    const [announcementQuery] = prismaMock.notification.findMany.mock.calls.map(
      ([query]) => query,
    );
    expect(deadlineQuery.where).toEqual({
      studentId: student.id,
      status: "OPEN",
    });
    expect(deadlineQuery).toEqual(
      expect.objectContaining({
        orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      }),
    );
    expect(announcementQuery.where.OR).toEqual([
      { groupId: student.group.id, studentId: null },
      { groupId: null, studentId: null },
    ]);
    expect(announcementQuery).toEqual(
      expect.objectContaining({
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 3,
      }),
    );
  });

  it("chooses the next lesson and shows the three newest changes", async () => {
    prismaMock.scheduleItem.findMany.mockResolvedValue([
      {
        id: 20,
        date: new Date("2026-11-14T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T10:00:00.000Z"),
        endTime: new Date("1970-01-01T11:00:00.000Z"),
        startsAt: null,
        endsAt: null,
        originalStartsAt: null,
        originalEndsAt: null,
        originalRoom: null,
        kind: "LECTURE",
        room: "101",
        teacher: "Преподаватель 1",
        status: "PLANNED",
        changeNote: null,
        subject: { name: "Уже прошедшая пара" },
      },
      {
        id: 21,
        date: new Date("2026-11-15T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T14:00:00.000Z"),
        endTime: new Date("1970-01-01T10:00:00.000Z"),
        startsAt: new Date("2026-11-15T10:00:00.000Z"),
        endsAt: new Date("2026-11-15T11:00:00.000Z"),
        originalStartsAt: new Date("2026-11-15T07:00:00.000Z"),
        originalEndsAt: new Date("2026-11-15T08:00:00.000Z"),
        originalRoom: "101",
        kind: "SEMINAR",
        room: "202",
        teacher: "Преподаватель 2",
        status: "RESCHEDULED",
        changeNote: "Новая аудитория",
        subject: { name: "Ближайшая пара" },
      },
      {
        id: 22,
        date: new Date("2026-11-16T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T10:00:00.000Z"),
        startsAt: new Date("2026-11-16T12:00:00.000Z"),
        endsAt: new Date("2026-11-16T13:00:00.000Z"),
        originalStartsAt: new Date("2026-11-16T09:00:00.000Z"),
        originalEndsAt: new Date("2026-11-16T10:00:00.000Z"),
        originalRoom: "303",
        kind: "LECTURE",
        room: "303",
        teacher: "Преподаватель 3",
        status: "RESCHEDULED",
        changeNote: null,
        subject: { name: "Следующая изменённая пара" },
      },
    ]);
    prismaMock.notification.findMany.mockResolvedValueOnce([
        {
          id: 5,
          title: "Свежая новость",
          text: "Текст новости",
          date: new Date("2026-11-14T11:00:00.000Z"),
        },
        {
          id: 4,
          title: "Предыдущая новость",
          text: "Текст новости",
          date: new Date("2026-11-13T11:00:00.000Z"),
        },
      ]);

    const data = await getCampusTodayData(
      new Date("2026-11-14T12:00:00.000Z"),
    );

    expect(data.nextLesson?.subject.name).toBe("Ближайшая пара");
    expect(data.changes).toHaveLength(3);
    expect(data.changes[0]).toEqual(
      expect.objectContaining({
        kind: "Перенос пары",
        title: "Следующая изменённая пара",
      }),
    );
    expect(data.changes[1]).toEqual(
      expect.objectContaining({
        kind: "Перенос пары",
        title: "Ближайшая пара",
      }),
    );
    expect(data.changes[2]).toEqual(
      expect.objectContaining({
        kind: "Объявление",
        title: "Свежая новость",
      }),
    );
  });

  it("keeps an in-progress lesson as the featured lesson", async () => {
    prismaMock.scheduleItem.findMany.mockResolvedValue([
      {
        id: 40,
        date: new Date("2026-11-14T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T14:00:00.000Z"),
        endTime: new Date("1970-01-01T16:00:00.000Z"),
        startsAt: new Date("2026-11-14T11:00:00.000Z"),
        endsAt: new Date("2026-11-14T13:00:00.000Z"),
        originalStartsAt: null,
        originalEndsAt: null,
        originalRoom: null,
        kind: "LECTURE",
        room: "101",
        teacher: "Преподаватель 1",
        status: "PLANNED",
        changeNote: null,
        subject: { name: "Пара сейчас" },
      },
      {
        id: 41,
        date: new Date("2026-11-14T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T17:00:00.000Z"),
        endTime: new Date("1970-01-01T19:00:00.000Z"),
        startsAt: new Date("2026-11-14T14:00:00.000Z"),
        endsAt: new Date("2026-11-14T16:00:00.000Z"),
        originalStartsAt: null,
        originalEndsAt: null,
        originalRoom: null,
        kind: "SEMINAR",
        room: "202",
        teacher: "Преподаватель 2",
        status: "PLANNED",
        changeNote: null,
        subject: { name: "Следующая пара" },
      },
    ]);

    const data = await getCampusTodayData(
      new Date("2026-11-14T12:00:00.000Z"),
    );

    expect(data.nextLesson).toEqual(
      expect.objectContaining({
        isCurrent: true,
        subject: { name: "Пара сейчас" },
      }),
    );
  });

  it("uses the current UTC time for the next pair and includes cancellations in changes", async () => {
    prismaMock.scheduleItem.findMany.mockResolvedValue([
      {
        id: 30,
        date: new Date("2026-11-15T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T08:00:00.000Z"),
        endTime: new Date("1970-01-01T09:30:00.000Z"),
        startsAt: new Date("2026-11-15T08:00:00.000Z"),
        endsAt: new Date("2026-11-15T09:30:00.000Z"),
        originalStartsAt: null,
        originalEndsAt: null,
        originalRoom: null,
        kind: "LECTURE",
        room: "101",
        teacher: "Преподаватель 1",
        status: "CANCELLED",
        changeNote: "Занятие отменено.",
        subject: { name: "Отменённая пара" },
      },
      {
        id: 31,
        date: new Date("2026-11-15T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T14:00:00.000Z"),
        endTime: new Date("1970-01-01T15:00:00.000Z"),
        startsAt: new Date("2026-11-15T10:00:00.000Z"),
        endsAt: new Date("2026-11-15T11:00:00.000Z"),
        originalStartsAt: new Date("2026-11-15T07:00:00.000Z"),
        originalEndsAt: new Date("2026-11-15T08:00:00.000Z"),
        originalRoom: "202",
        kind: "SEMINAR",
        room: "303",
        teacher: "Преподаватель 2",
        status: "RESCHEDULED",
        changeNote: "Время изменено.",
        subject: { name: "Перенесённая пара" },
      },
    ]);

    const data = await getCampusTodayData(
      new Date("2026-11-14T12:00:00.000Z"),
    );

    expect(data.nextLesson?.subject.name).toBe("Перенесённая пара");
    expect(data.nextLesson?.startTime.toISOString()).toBe(
      "2026-11-15T10:00:00.000Z",
    );
    expect(data.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "Отмена пары",
          title: "Отменённая пара",
        }),
        expect.objectContaining({
          kind: "Перенос пары",
          title: "Перенесённая пара",
        }),
      ]),
    );
  });
});

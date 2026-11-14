import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStudentMock, prismaMock } = vi.hoisted(() => ({
  requireStudentMock: vi.fn(),
  prismaMock: {
    scheduleItem: { findMany: vi.fn() },
    notification: { findMany: vi.fn(), count: vi.fn() },
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

beforeEach(() => {
  vi.clearAllMocks();
  requireStudentMock.mockResolvedValue(student);
  prismaMock.scheduleItem.findMany.mockResolvedValue([]);
  prismaMock.notification.findMany.mockResolvedValue([]);
  prismaMock.notification.count.mockResolvedValue(0);
  prismaMock.request.findMany.mockResolvedValue([]);
});

describe("getCampusTodayData", () => {
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

    const [deadlineQuery, announcementQuery] =
      prismaMock.notification.findMany.mock.calls.map(([query]) => query);
    expect(deadlineQuery.where.OR).toEqual([
      { studentId: student.id },
      { groupId: student.group.id },
      { studentId: null, groupId: null },
    ]);
    expect(deadlineQuery.where.deadline).toEqual(
      expect.objectContaining({
        gte: now,
        lt: expect.any(Date),
      }),
    );
    expect(deadlineQuery).toEqual(
      expect.objectContaining({
        orderBy: [{ deadline: "asc" }, { id: "asc" }],
        take: 3,
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
    expect(prismaMock.notification.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { studentId: student.id },
          { groupId: student.group.id },
          { studentId: null, groupId: null },
        ],
        isRead: false,
      },
    });
  });

  it("chooses the next lesson and shows the three newest changes", async () => {
    prismaMock.scheduleItem.findMany.mockResolvedValue([
      {
        id: 20,
        date: new Date("2026-11-14T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T10:00:00.000Z"),
        endTime: new Date("1970-01-01T11:00:00.000Z"),
        classroom: "101",
        teacher: "Преподаватель 1",
        isRescheduled: false,
        comment: null,
        subject: { name: "Уже прошедшая пара" },
      },
      {
        id: 21,
        date: new Date("2026-11-15T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T10:00:00.000Z"),
        classroom: "202",
        teacher: "Преподаватель 2",
        isRescheduled: true,
        comment: "Новая аудитория",
        subject: { name: "Ближайшая пара" },
      },
      {
        id: 22,
        date: new Date("2026-11-16T00:00:00.000Z"),
        weekday: null,
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T10:00:00.000Z"),
        classroom: "303",
        teacher: "Преподаватель 3",
        isRescheduled: true,
        comment: null,
        subject: { name: "Следующая изменённая пара" },
      },
    ]);
    prismaMock.notification.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
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
});

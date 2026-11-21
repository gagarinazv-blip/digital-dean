import { beforeEach, describe, expect, it, vi } from "vitest";

const { scheduleFindManyMock, requestFindManyMock, deadlineFindManyMock } =
  vi.hoisted(() => ({
    scheduleFindManyMock: vi.fn(),
    requestFindManyMock: vi.fn(),
    deadlineFindManyMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    scheduleItem: { findMany: scheduleFindManyMock },
    request: { findMany: requestFindManyMock },
    deadline: { findMany: deadlineFindManyMock },
  })),
}));

import { presentStudentNotifications } from "../src/lib/notification-presentation";

const requestId = "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1";
const createdAt = new Date("2026-11-20T09:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  scheduleFindManyMock.mockResolvedValue([
    {
      id: 42,
      date: new Date("2026-11-20T00:00:00.000Z"),
      startsAt: new Date("2026-11-20T05:30:00.000Z"),
      endsAt: new Date("2026-11-20T07:00:00.000Z"),
      originalStartsAt: new Date("2026-11-20T04:30:00.000Z"),
      originalEndsAt: new Date("2026-11-20T06:00:00.000Z"),
      originalRoom: "МО-101",
      room: "МО-202",
      changeNote: "Заменили аудиторию",
      subject: { name: "История цивилизаций" },
    },
  ]);
  requestFindManyMock.mockResolvedValue([
    { publicId: requestId, status: "IN_PROGRESS", type: "CERTIFICATE" },
  ]);
  deadlineFindManyMock.mockResolvedValue([]);
});

describe("notification presentation", () => {
  it("builds safe contextual details scoped to the current student and group", async () => {
    const result = await presentStudentNotifications(
      [
        {
          publicId: "schedule",
          type: "SCHEDULE_CHANGE",
          title: "[TEST SEED] Расписание",
          text: "Изменение [TEST SEED]",
          targetType: "SCHEDULE_ITEM",
          targetId: "42",
          createdAt,
          readAt: null,
        },
        {
          publicId: requestId,
          type: "REQUEST_STATUS",
          title: "Заявка",
          text: "В работе",
          targetType: "REQUEST",
          targetId: requestId,
          createdAt,
          readAt: null,
        },
        {
          publicId: "missing-deadline",
          type: "DEADLINE",
          title: "Срок",
          text: "Открыть",
          targetType: "DEADLINE",
          targetId: "other-student-deadline",
          createdAt,
          readAt: null,
        },
        {
          publicId: "announcement",
          type: "ANNOUNCEMENT",
          title: "Объявление",
          text: "Полный текст",
          targetType: null,
          targetId: null,
          createdAt,
          readAt: null,
        },
      ],
      17,
      41,
    );

    expect(scheduleFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [42] }, groupId: 41 },
      }),
    );
    expect(requestFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicId: { in: [requestId] }, studentId: 17 },
      }),
    );
    expect(deadlineFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["other-student-deadline"] }, studentId: 17 },
      }),
    );
    expect(result[0]?.href).toBe(
      "/schedule?view=week&date=2026-11-20&day=2026-11-20&lesson=42",
    );
    expect(result[0]?.title).toBe("Расписание");
    expect(result[0]?.text).toBe("Изменение");
    expect(JSON.stringify(result)).not.toContain("[TEST SEED]");
    expect(result[0]?.details.schedule?.previousRoom).toBe("МО-101");
    expect(result[0]?.targetAvailable).toBe(true);
    expect(result[1]?.details.request?.statusLabel).toBe("В работе");
    expect(result[2]?.targetAvailable).toBe(false);
    expect(result[2]?.href).toBeNull();
    expect(result[3]?.href).toBeNull();
    expect(result[3]?.targetAvailable).toBeNull();
  });
});

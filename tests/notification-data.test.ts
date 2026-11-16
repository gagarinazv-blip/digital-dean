import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, findFirstMock, countMock, updateManyMock } =
  vi.hoisted(() => ({
    findManyMock: vi.fn(),
    findFirstMock: vi.fn(),
    countMock: vi.fn(),
    updateManyMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    notification: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      count: countMock,
      updateMany: updateManyMock,
    },
  })),
}));

import {
  countUnreadStudentNotifications,
  getStudentNotification,
  getStudentNotifications,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
} from "../src/lib/notification-data";

beforeEach(() => {
  vi.clearAllMocks();
  findManyMock.mockResolvedValue([]);
  findFirstMock.mockResolvedValue(null);
  countMock.mockResolvedValue(0);
  updateManyMock.mockResolvedValue({ count: 0 });
});

describe("student notification data", () => {
  it("lists and counts only notifications owned by the supplied student", async () => {
    await getStudentNotifications(17);
    await countUnreadStudentNotifications(17);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: { not: null }, studentId: 17 },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(countMock).toHaveBeenCalledWith({
      where: { type: { not: null }, studentId: 17, readAt: null },
    });
  });

  it("looks up and marks a notification only inside its owner's scope", async () => {
    const publicId = "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1";
    const readAt = new Date("2026-11-16T10:00:00.000Z");

    await getStudentNotification(publicId, 17);
    await markStudentNotificationRead(publicId, 17, readAt);

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: { not: null }, publicId, studentId: 17 },
      }),
    );
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        type: { not: null },
        publicId,
        studentId: 17,
        readAt: null,
      },
      data: { readAt, isRead: true },
    });
  });

  it("marks all of one student's unread notifications and leaves other owners untouched", async () => {
    const readAt = new Date("2026-11-16T10:00:00.000Z");
    await markAllStudentNotificationsRead(17, readAt);

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { type: { not: null }, studentId: 17, readAt: null },
      data: { readAt, isRead: true },
    });
  });
});

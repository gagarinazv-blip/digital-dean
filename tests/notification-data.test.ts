import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, findFirstMock, countMock, groupByMock, updateManyMock } =
  vi.hoisted(() => ({
    findManyMock: vi.fn(),
    findFirstMock: vi.fn(),
    countMock: vi.fn(),
    groupByMock: vi.fn(),
    updateManyMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    notification: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      count: countMock,
      groupBy: groupByMock,
      updateMany: updateManyMock,
    },
  })),
}));

import {
  countUnreadStudentNotifications,
  getStudentNotification,
  getStudentNotificationPage,
  getStudentNotificationsByPublicIds,
  getStudentNotifications,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
  markStudentNotificationReadState,
  markStudentNotificationsReadState,
  studentOwnsNotificationCursor,
} from "../src/lib/notification-data";

beforeEach(() => {
  vi.clearAllMocks();
  findManyMock.mockResolvedValue([]);
  findFirstMock.mockResolvedValue(null);
  countMock.mockResolvedValue(0);
  groupByMock.mockResolvedValue([]);
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

  it("paginates only the owner's records and counts each notification type", async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(2);
    groupByMock.mockResolvedValue([
      { type: "ANNOUNCEMENT", _count: { _all: 1 } },
      { type: "REQUEST_STATUS", _count: { _all: 2 } },
    ]);

    const result = await getStudentNotificationPage(17, 20, {
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: { not: null }, studentId: 17 },
        cursor: { publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1" },
        skip: 1,
        take: 21,
      }),
    );
    expect(result.unreadCount).toBe(2);
    expect(result.typeCounts).toEqual({
      ANNOUNCEMENT: 1,
      REQUEST_STATUS: 2,
    });
    expect(groupByMock).toHaveBeenCalledWith({
      by: ["type"],
      where: { type: { not: null }, studentId: 17 },
      _count: { _all: true },
    });
  });

  it("checks bulk and cursor ownership before allowing updates", async () => {
    const publicId = "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1";
    await getStudentNotificationsByPublicIds([publicId], 17);
    await studentOwnsNotificationCursor(publicId, 17);
    await markStudentNotificationReadState(publicId, 17, false);
    await markStudentNotificationsReadState([publicId], 17, true);

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        type: { not: null },
        publicId: { in: [publicId] },
        studentId: 17,
      },
      select: { publicId: true },
    });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { type: { not: null }, publicId, studentId: 17 },
      select: { publicId: true },
    });
    expect(updateManyMock).toHaveBeenNthCalledWith(1, {
      where: {
        type: { not: null },
        publicId,
        studentId: 17,
        readAt: { not: null },
      },
      data: { readAt: null, isRead: false },
    });
    expect(updateManyMock).toHaveBeenNthCalledWith(2, {
      where: {
        type: { not: null },
        publicId: { in: [publicId] },
        studentId: 17,
        readAt: null,
      },
      data: { readAt: expect.any(Date), isRead: true },
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

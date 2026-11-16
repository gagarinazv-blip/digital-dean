import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  notFoundMock,
  redirectMock,
  requireStudentContextMock,
  getStudentNotificationMock,
  markStudentNotificationReadMock,
  scheduleFindFirstMock,
  deadlineFindFirstMock,
  requestFindFirstMock,
} = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  requireStudentContextMock: vi.fn(),
  getStudentNotificationMock: vi.fn(),
  markStudentNotificationReadMock: vi.fn(),
  scheduleFindFirstMock: vi.fn(),
  deadlineFindFirstMock: vi.fn(),
  requestFindFirstMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

vi.mock("@/lib/student", () => ({
  requireStudentContext: requireStudentContextMock,
}));

vi.mock("@/lib/notification-data", () => ({
  getStudentNotification: getStudentNotificationMock,
  markStudentNotificationRead: markStudentNotificationReadMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    scheduleItem: { findFirst: scheduleFindFirstMock },
    deadline: { findFirst: deadlineFindFirstMock },
    request: { findFirst: requestFindFirstMock },
  })),
}));

import OpenNotificationPage from "../src/app/(campus)/notifications/[notificationId]/page";

const notificationId = "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1";

beforeEach(() => {
  vi.clearAllMocks();
  requireStudentContextMock.mockResolvedValue({
    userId: 7,
    student: { id: 17, group: { id: 41 } },
  });
  getStudentNotificationMock.mockResolvedValue({
    publicId: notificationId,
    type: "SCHEDULE_CHANGE",
    targetType: "SCHEDULE_ITEM",
    targetId: "42",
  });
  markStudentNotificationReadMock.mockResolvedValue({ count: 1 });
  scheduleFindFirstMock.mockResolvedValue({ id: 42 });
  deadlineFindFirstMock.mockResolvedValue({ id: "deadline-1" });
  requestFindFirstMock.mockResolvedValue({ publicId: notificationId });
  notFoundMock.mockImplementation(() => {
    throw new Error("Not found");
  });
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirect ${path}`);
  });
});

describe("open notification route", () => {
  it("marks the owned notification read before opening its schedule context", async () => {
    await expect(
      OpenNotificationPage({
        params: Promise.resolve({ notificationId }),
      }),
    ).rejects.toThrow("Redirect /schedule?view=week&lesson=42#lesson-42");

    expect(getStudentNotificationMock).toHaveBeenCalledWith(notificationId, 17);
    expect(scheduleFindFirstMock).toHaveBeenCalledWith({
      where: { id: 42, groupId: 41 },
      select: { id: true },
    });
    expect(markStudentNotificationReadMock).toHaveBeenCalledWith(
      notificationId,
      17,
    );
  });

  it.each([
    ["DEADLINE", "DEADLINE", "deadline-1", "/deadlines#deadline-deadline-1"],
    [
      "REQUEST_STATUS",
      "REQUEST",
      notificationId,
      `/requests/${notificationId}`,
    ],
  ] as const)(
    "opens an owned %s target",
    async (type, targetType, targetId, destination) => {
      getStudentNotificationMock.mockResolvedValue({
        publicId: notificationId,
        type,
        targetType,
        targetId,
      });

      await expect(
        OpenNotificationPage({
          params: Promise.resolve({ notificationId }),
        }),
      ).rejects.toThrow(`Redirect ${destination}`);

      if (targetType === "DEADLINE") {
        expect(deadlineFindFirstMock).toHaveBeenCalledWith({
          where: { id: targetId, studentId: 17 },
          select: { id: true },
        });
      } else {
        expect(requestFindFirstMock).toHaveBeenCalledWith({
          where: { publicId: targetId, studentId: 17 },
          select: { publicId: true },
        });
      }
    },
  );

  it("does not read or redirect for a foreign or unavailable target", async () => {
    getStudentNotificationMock.mockResolvedValue(null);

    await expect(
      OpenNotificationPage({
        params: Promise.resolve({ notificationId }),
      }),
    ).rejects.toThrow("Not found");
    expect(markStudentNotificationReadMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not expose a request target owned by another student", async () => {
    getStudentNotificationMock.mockResolvedValue({
      publicId: notificationId,
      type: "REQUEST_STATUS",
      targetType: "REQUEST",
      targetId: notificationId,
    });
    requestFindFirstMock.mockResolvedValue(null);

    await expect(
      OpenNotificationPage({
        params: Promise.resolve({ notificationId }),
      }),
    ).rejects.toThrow("Not found");
    expect(requestFindFirstMock).toHaveBeenCalledWith({
      where: { publicId: notificationId, studentId: 17 },
      select: { publicId: true },
    });
    expect(markStudentNotificationReadMock).not.toHaveBeenCalled();
  });
});

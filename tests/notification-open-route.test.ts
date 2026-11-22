import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  notFoundMock,
  redirectMock,
  requireStudentContextMock,
  getStudentNotificationMock,
  markStudentNotificationReadMock,
  presentStudentNotificationsMock,
} = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  requireStudentContextMock: vi.fn(),
  getStudentNotificationMock: vi.fn(),
  markStudentNotificationReadMock: vi.fn(),
  presentStudentNotificationsMock: vi.fn(),
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

vi.mock("@/lib/notification-presentation", () => ({
  presentStudentNotifications: presentStudentNotificationsMock,
}));

import { openNotification } from "../src/app/(campus)/notifications/[notificationId]/open-notification";

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
  presentStudentNotificationsMock.mockResolvedValue([
    {
      publicId: notificationId,
      href: "/schedule?view=week&date=2026-11-20&day=2026-11-20&lesson=42",
      targetAvailable: true,
    },
  ]);
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
      openNotification({
        params: Promise.resolve({ notificationId }),
      }),
    ).rejects.toThrow(
      "Redirect /schedule?view=week&date=2026-11-20&day=2026-11-20&lesson=42",
    );

    expect(getStudentNotificationMock).toHaveBeenCalledWith(notificationId, 17);
    expect(presentStudentNotificationsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ publicId: notificationId })],
      17,
      41,
    );
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
      presentStudentNotificationsMock.mockResolvedValue([
        { publicId: notificationId, href: destination, targetAvailable: true },
      ]);

      await expect(
        openNotification({
          params: Promise.resolve({ notificationId }),
        }),
      ).rejects.toThrow(`Redirect ${destination}`);
      expect(markStudentNotificationReadMock).toHaveBeenCalledWith(
        notificationId,
        17,
      );
    },
  );

  it("keeps unavailable target details readable instead of returning a dead link", async () => {
    presentStudentNotificationsMock.mockResolvedValue([
      { publicId: notificationId, href: null, targetAvailable: false },
    ]);

    await expect(
      openNotification({
        params: Promise.resolve({ notificationId }),
      }),
    ).rejects.toThrow(`Redirect /notifications?open=${notificationId}`);
    expect(markStudentNotificationReadMock).toHaveBeenCalledWith(
      notificationId,
      17,
    );
  });

  it("opens announcement details even when the announcement has no action target", async () => {
    getStudentNotificationMock.mockResolvedValue({
      publicId: notificationId,
      type: "ANNOUNCEMENT",
      targetType: null,
      targetId: null,
    });
    presentStudentNotificationsMock.mockResolvedValue([
      { publicId: notificationId, href: null, targetAvailable: null },
    ]);

    await expect(
      openNotification({
        params: Promise.resolve({ notificationId }),
      }),
    ).rejects.toThrow(`Redirect /notifications?open=${notificationId}`);
  });

  it("does not read or redirect for a foreign notification", async () => {
    getStudentNotificationMock.mockResolvedValue(null);

    await expect(
      openNotification({
        params: Promise.resolve({ notificationId }),
      }),
    ).rejects.toThrow("Not found");
    expect(presentStudentNotificationsMock).not.toHaveBeenCalled();
    expect(markStudentNotificationReadMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

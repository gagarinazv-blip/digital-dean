import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertSameSiteRequestMock,
  getCurrentUserMock,
  getStudentNotificationMock,
  getStudentNotificationPageMock,
  getStudentNotificationsByPublicIdsMock,
  countUnreadStudentNotificationsMock,
  markAllStudentNotificationsReadMock,
  markStudentNotificationReadStateMock,
  markStudentNotificationsReadStateMock,
  studentOwnsNotificationCursorMock,
  presentStudentNotificationsMock,
} = vi.hoisted(() => ({
  assertSameSiteRequestMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getStudentNotificationMock: vi.fn(),
  getStudentNotificationPageMock: vi.fn(),
  getStudentNotificationsByPublicIdsMock: vi.fn(),
  countUnreadStudentNotificationsMock: vi.fn(),
  markAllStudentNotificationsReadMock: vi.fn(),
  markStudentNotificationReadStateMock: vi.fn(),
  markStudentNotificationsReadStateMock: vi.fn(),
  studentOwnsNotificationCursorMock: vi.fn(),
  presentStudentNotificationsMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/notification-data", () => ({
  countUnreadStudentNotifications: countUnreadStudentNotificationsMock,
  getStudentNotification: getStudentNotificationMock,
  getStudentNotificationPage: getStudentNotificationPageMock,
  getStudentNotificationsByPublicIds: getStudentNotificationsByPublicIdsMock,
  markAllStudentNotificationsRead: markAllStudentNotificationsReadMock,
  markStudentNotificationReadState: markStudentNotificationReadStateMock,
  markStudentNotificationsReadState: markStudentNotificationsReadStateMock,
  studentOwnsNotificationCursor: studentOwnsNotificationCursorMock,
}));

vi.mock("@/lib/notification-presentation", () => ({
  presentStudentNotifications: presentStudentNotificationsMock,
}));

import {
  GET,
  POST,
} from "../src/app/api/student-notifications/route";

const studentUser = {
  role: "STUDENT",
  student: { id: 17, group: { id: 41 } },
};
const notificationId = "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1";

function postRequest(body: string): Request {
  return new Request("http://localhost/api/student-notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  assertSameSiteRequestMock.mockResolvedValue(undefined);
  getCurrentUserMock.mockResolvedValue(studentUser);
  getStudentNotificationMock.mockResolvedValue(null);
  getStudentNotificationPageMock.mockResolvedValue({
    notifications: [],
    unreadCount: 0,
    typeCounts: {},
    hasMore: false,
    nextCursor: null,
  });
  getStudentNotificationsByPublicIdsMock.mockResolvedValue([
    { publicId: notificationId },
  ]);
  presentStudentNotificationsMock.mockResolvedValue([]);
  countUnreadStudentNotificationsMock.mockResolvedValue(0);
  markAllStudentNotificationsReadMock.mockResolvedValue(undefined);
  markStudentNotificationReadStateMock.mockResolvedValue({ count: 1 });
  markStudentNotificationsReadStateMock.mockResolvedValue({ count: 1 });
  studentOwnsNotificationCursorMock.mockResolvedValue(true);
});

describe("student notifications API", () => {
  it("returns all notification type counts, including opportunity updates", async () => {
    getStudentNotificationPageMock.mockResolvedValue({
      notifications: [],
      unreadCount: 2,
      typeCounts: { OPPORTUNITY_STATUS: 2 },
      hasMore: false,
      nextCursor: null,
    });

    const response = await GET();

    expect(await response.json()).toMatchObject({
      typeCounts: {
        SCHEDULE_CHANGE: 0,
        DEADLINE: 0,
        REQUEST_STATUS: 0,
        ANNOUNCEMENT: 0,
        OPPORTUNITY_STATUS: 2,
      },
    });
  });

  it("returns 401 only when there is no session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required.",
    });
  });

  it("returns 401 for a read operation without a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await POST(
      postRequest(JSON.stringify({ all: true })),
    );

    expect(response.status).toBe(401);
    expect(markAllStudentNotificationsReadMock).not.toHaveBeenCalled();
  });

  it("returns 500 when loading notifications fails", async () => {
    getStudentNotificationPageMock.mockRejectedValue(new Error("Database down"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error." });
  });

  it("does not turn session lookup failures into 401 responses", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("Database down"));

    const response = await GET();

    expect(response.status).toBe(500);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(postRequest("{"));

    expect(response.status).toBe(400);
    expect(markStudentNotificationReadStateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid notification operations", async () => {
    const response = await POST(postRequest(JSON.stringify({ publicId: "bad" })));

    expect(response.status).toBe(400);
    expect(markStudentNotificationReadStateMock).not.toHaveBeenCalled();
  });

  it("marks the authenticated student's notification and returns the fresh count", async () => {
    countUnreadStudentNotificationsMock.mockResolvedValue(3);

    const response = await POST(
      postRequest(JSON.stringify({ publicId: notificationId })),
    );

    expect(response.status).toBe(200);
    expect(markStudentNotificationReadStateMock).toHaveBeenCalledWith(
      notificationId,
      17,
      true,
    );
    expect(await response.json()).toEqual({ unreadCount: 3 });
  });

  it("supports marking one notification unread", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ publicId: notificationId, read: false })),
    );

    expect(response.status).toBe(200);
    expect(markStudentNotificationReadStateMock).toHaveBeenCalledWith(
      notificationId,
      17,
      false,
    );
  });

  it("supports bulk read actions for records owned by the student", async () => {
    countUnreadStudentNotificationsMock.mockResolvedValue(0);
    const response = await POST(
      postRequest(
        JSON.stringify({ publicIds: [notificationId], read: true }),
      ),
    );

    expect(response.status).toBe(200);
    expect(markStudentNotificationsReadStateMock).toHaveBeenCalledWith(
      [notificationId],
      17,
      true,
    );
    expect(await response.json()).toEqual({ unreadCount: 0 });
  });

  it("supports marking all of the authenticated student's notifications read", async () => {
    const response = await POST(postRequest(JSON.stringify({ all: true })));

    expect(response.status).toBe(200);
    expect(markAllStudentNotificationsReadMock).toHaveBeenCalledWith(17);
    expect(await response.json()).toEqual({ unreadCount: 0 });
  });

  it("returns 404 for a notification not owned by the current student", async () => {
    getStudentNotificationsByPublicIdsMock.mockResolvedValue([]);

    const response = await POST(
      postRequest(JSON.stringify({ publicId: notificationId })),
    );

    expect(response.status).toBe(404);
    expect(markStudentNotificationReadStateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid pagination and 404 for a foreign cursor", async () => {
    const badLimit = await GET(
      new Request("http://localhost/api/student-notifications?limit=0"),
    );
    expect(badLimit.status).toBe(400);

    studentOwnsNotificationCursorMock.mockResolvedValue(false);
    const foreignCursor = await GET(
      new Request(
        `http://localhost/api/student-notifications?cursor=${notificationId}`,
      ),
    );
    expect(foreignCursor.status).toBe(404);
  });

  it("returns an owned announcement for direct detail links", async () => {
    getStudentNotificationMock.mockResolvedValue({
      publicId: notificationId,
      type: "ANNOUNCEMENT",
      title: "Объявление",
      text: "Полный текст объявления",
      targetType: null,
      targetId: null,
      createdAt: new Date("2026-11-20T09:00:00.000Z"),
      readAt: null,
    });
    presentStudentNotificationsMock.mockResolvedValue([
      {
        publicId: notificationId,
        type: "ANNOUNCEMENT",
        title: "Объявление",
        text: "Полный текст объявления",
        targetType: null,
        targetId: null,
        href: null,
        createdAt: "2026-11-20T09:00:00.000Z",
        readAt: null,
        source: "Объявление",
        context: "Сегодня",
        targetAvailable: null,
        details: {},
      },
    ]);

    const response = await GET(
      new Request(
        `http://localhost/api/student-notifications?publicId=${notificationId}`,
      ),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).notification.type).toBe("ANNOUNCEMENT");
  });

  it("returns 500 rather than 401 when a read operation fails", async () => {
    markAllStudentNotificationsReadMock.mockRejectedValue(
      new Error("Database down"),
    );

    const response = await POST(postRequest(JSON.stringify({ all: true })));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error." });
  });
});

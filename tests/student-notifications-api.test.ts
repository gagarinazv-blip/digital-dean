import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertSameSiteRequestMock,
  getCurrentUserMock,
  getStudentNotificationsMock,
  countUnreadStudentNotificationsMock,
  markAllStudentNotificationsReadMock,
  markStudentNotificationReadMock,
} = vi.hoisted(() => ({
  assertSameSiteRequestMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getStudentNotificationsMock: vi.fn(),
  countUnreadStudentNotificationsMock: vi.fn(),
  markAllStudentNotificationsReadMock: vi.fn(),
  markStudentNotificationReadMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/notification-data", () => ({
  countUnreadStudentNotifications: countUnreadStudentNotificationsMock,
  getStudentNotifications: getStudentNotificationsMock,
  markAllStudentNotificationsRead: markAllStudentNotificationsReadMock,
  markStudentNotificationRead: markStudentNotificationReadMock,
}));

import {
  GET,
  POST,
} from "../src/app/api/student-notifications/route";

const studentUser = {
  role: "STUDENT",
  student: { id: 17 },
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
  getStudentNotificationsMock.mockResolvedValue([]);
  countUnreadStudentNotificationsMock.mockResolvedValue(0);
  markAllStudentNotificationsReadMock.mockResolvedValue(undefined);
  markStudentNotificationReadMock.mockResolvedValue(undefined);
});

describe("student notifications API", () => {
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
    getStudentNotificationsMock.mockRejectedValue(new Error("Database down"));

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
    expect(markStudentNotificationReadMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid notification operations", async () => {
    const response = await POST(postRequest(JSON.stringify({ publicId: "bad" })));

    expect(response.status).toBe(400);
    expect(markStudentNotificationReadMock).not.toHaveBeenCalled();
  });

  it("marks the authenticated student's notification and returns the fresh count", async () => {
    countUnreadStudentNotificationsMock.mockResolvedValue(3);

    const response = await POST(
      postRequest(JSON.stringify({ publicId: notificationId })),
    );

    expect(response.status).toBe(200);
    expect(markStudentNotificationReadMock).toHaveBeenCalledWith(
      notificationId,
      17,
    );
    expect(await response.json()).toEqual({ unreadCount: 3 });
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

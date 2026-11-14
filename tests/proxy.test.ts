import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionPrincipalForTokenMock,
  findStudentRequestMock,
  findStaffRequestMock,
} = vi.hoisted(() => ({
  getSessionPrincipalForTokenMock: vi.fn(),
  findStudentRequestMock: vi.fn(),
  findStaffRequestMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionPrincipalForToken: getSessionPrincipalForTokenMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    request: {
      findFirst: findStudentRequestMock,
      findUnique: findStaffRequestMock,
    },
  })),
}));

import { proxy } from "../src/proxy";

const studentPrincipal = {
  role: "STUDENT" as const,
  studentId: 20,
  staffProfile: null,
};

const staffPrincipal = {
  role: "STAFF" as const,
  studentId: null,
  staffProfile: {
    id: 40,
    department: "Учебный отдел",
    isSupervisor: false,
  },
};

function makeRequest(path: string, token?: string) {
  const headers = new Headers();
  if (token) {
    headers.set("cookie", `digital-dean-session=${token}`);
  }

  return new NextRequest(`https://digital-dean.test${path}`, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionPrincipalForTokenMock.mockResolvedValue(null);
  findStudentRequestMock.mockResolvedValue(null);
  findStaffRequestMock.mockResolvedValue(null);
});

describe("role and request access proxy", () => {
  it("redirects staff-area visitors without a session to staff login", async () => {
    const response = await proxy(makeRequest("/staff"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://digital-dean.test/staff/login",
    );
    expect(getSessionPrincipalForTokenMock).not.toHaveBeenCalled();
  });

  it("redirects student-area visitors without a session to student login", async () => {
    const response = await proxy(makeRequest("/schedule"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://digital-dean.test/login",
    );
    expect(getSessionPrincipalForTokenMock).not.toHaveBeenCalled();
  });

  it("returns 403 when a student opens the staff area", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(studentPrincipal);

    const response = await proxy(makeRequest("/staff", "opaque-session-token"));

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("403 — Доступ запрещён");
    expect(getSessionPrincipalForTokenMock).toHaveBeenCalledWith(
      "opaque-session-token",
    );
  });

  it("returns 403 when staff opens a student-only section", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(staffPrincipal);

    const response = await proxy(
      makeRequest("/schedule", "opaque-session-token"),
    );

    expect(response.status).toBe(403);
  });

  it("allows a student to open their own request", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(studentPrincipal);
    findStudentRequestMock.mockResolvedValue({ id: 243 });

    const response = await proxy(
      makeRequest("/requests/243", "opaque-session-token"),
    );

    expect(response.status).toBe(200);
    expect(findStudentRequestMock).toHaveBeenCalledWith({
      where: { id: 243, studentId: 20 },
      select: { id: true },
    });
  });

  it("returns a real 404 for another student's request", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(studentPrincipal);

    const response = await proxy(
      makeRequest("/requests/243", "opaque-session-token"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });

  it("returns 404 for malformed request IDs before page streaming", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(studentPrincipal);

    const response = await proxy(
      makeRequest("/requests/not-an-id", "opaque-session-token"),
    );

    expect(response.status).toBe(404);
    expect(findStudentRequestMock).not.toHaveBeenCalled();
  });

  it("returns 404 when a staff member cannot access a request", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(staffPrincipal);
    findStaffRequestMock.mockResolvedValue({
      assignedToId: 41,
      type: "CERTIFICATE",
    });

    const response = await proxy(
      makeRequest("/staff/requests/243", "opaque-session-token"),
    );

    expect(response.status).toBe(404);
    expect(findStaffRequestMock).toHaveBeenCalledWith({
      where: { id: 243 },
      select: { assignedToId: true, type: true },
    });
  });

  it("allows staff to continue to requests inside their permission scope", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(staffPrincipal);
    findStaffRequestMock.mockResolvedValue({
      assignedToId: null,
      type: "CERTIFICATE",
    });

    const response = await proxy(
      makeRequest("/staff/requests/243", "opaque-session-token"),
    );

    expect(response.status).toBe(200);
  });

  it("allows staff to continue to the server-checked staff area", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(staffPrincipal);

    const response = await proxy(makeRequest("/staff", "opaque-session-token"));

    expect(response.status).toBe(200);
  });
});

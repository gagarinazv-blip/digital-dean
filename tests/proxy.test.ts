import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionPrincipalForTokenMock,
  findStaffRequestMock,
} = vi.hoisted(() => ({
  getSessionPrincipalForTokenMock: vi.fn(),
  findStaffRequestMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionPrincipalForToken: getSessionPrincipalForTokenMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    request: {
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

const managerPrincipal = {
  ...staffPrincipal,
  staffProfile: {
    ...staffPrincipal.staffProfile,
    isSupervisor: true,
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
  findStaffRequestMock.mockResolvedValue(null);
});

describe("role and request access proxy", () => {
  it("redirects the old staff-login URL to the staff login tab", async () => {
    const response = await proxy(makeRequest("/staff/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://digital-dean.test/login?role=staff",
    );
    expect(getSessionPrincipalForTokenMock).not.toHaveBeenCalled();
  });

  it("redirects staff-area visitors without a session to the staff login tab", async () => {
    const response = await proxy(makeRequest("/staff"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://digital-dean.test/login?role=staff",
    );
    expect(getSessionPrincipalForTokenMock).not.toHaveBeenCalled();
  });

  it("redirects student-area visitors without a session to student login", async () => {
    const response = await proxy(makeRequest("/schedule"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://digital-dean.test/login?role=student",
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

  it("redirects an expired staff session to the staff login tab", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(null);

    const response = await proxy(
      makeRequest("/staff/requests/243", "expired-session-token"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://digital-dean.test/login?role=staff",
    );
  });

  it("returns 403 when staff opens a student-only section", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(staffPrincipal);

    const response = await proxy(
      makeRequest("/schedule", "opaque-session-token"),
    );

    expect(response.status).toBe(403);
  });

  it("allows a signed-in student request route to reach its owner-scoped loader", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(studentPrincipal);

    const response = await proxy(
      makeRequest(
        "/requests/b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
        "opaque-session-token",
      ),
    );

    expect(response.status).toBe(200);
    expect(findStaffRequestMock).not.toHaveBeenCalled();
  });

  it("lets the page data loader render its not-found UI for a foreign request", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(studentPrincipal);

    const response = await proxy(
      makeRequest(
        "/requests/4f4a8f8e-f3ef-4f34-a65e-b9e3cb279ce0",
        "opaque-session-token",
      ),
    );

    expect(response.status).toBe(200);
    expect(findStaffRequestMock).not.toHaveBeenCalled();
  });

  it("lets malformed student request IDs reach notFound() in the route loader", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(studentPrincipal);

    const response = await proxy(
      makeRequest("/requests/not-an-id", "opaque-session-token"),
    );

    expect(response.status).toBe(200);
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

  it("allows staff.manager to open another employee's request", async () => {
    getSessionPrincipalForTokenMock.mockResolvedValue(managerPrincipal);
    findStaffRequestMock.mockResolvedValue({
      assignedToId: 41,
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

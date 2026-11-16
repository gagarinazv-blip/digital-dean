import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, findRequestMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  findRequestMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    request: { findFirst: findRequestMock },
  })),
}));

import { GET } from "../src/app/api/requests/[publicId]/document/route";

const publicId = "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1";

const studentUser = {
  id: 10,
  login: "student.alpha",
  role: "STUDENT" as const,
  student: { id: 20 },
};

const request = {
  publicId,
  type: "CERTIFICATE" as const,
  catalogCode: "STUDY_CERTIFICATE",
  formFields: { purpose: "<script>alert('x')</script>" },
  profileSnapshot: {
    fullName: "<img src=x onerror=alert(1)>",
    faculty: "Факультет",
    direction: "Направление",
    course: 2,
    groupName: "ТЕСТ-01",
    recordBookNumber: "ТЕСТ-001",
    studyForm: "FULL_TIME",
  },
  updatedAt: new Date("2026-03-20T12:00:00.000Z"),
};

function getDocument() {
  return GET(
    new Request(`https://digital-dean.test/api/requests/${publicId}/document`),
    { params: Promise.resolve({ publicId }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue(studentUser);
  findRequestMock.mockResolvedValue(request);
});

describe("request demo document download", () => {
  it("requires a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await getDocument();

    expect(response.status).toBe(401);
    expect(findRequestMock).not.toHaveBeenCalled();
  });

  it("only generates a document for the owner's READY request", async () => {
    const response = await getDocument();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      `attachment; filename="request-${publicId}.html"`,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(findRequestMock).toHaveBeenCalledWith({
      where: { publicId, studentId: 20, status: "READY" },
      select: {
        publicId: true,
        type: true,
        catalogCode: true,
        formFields: true,
        profileSnapshot: true,
        updatedAt: true,
      },
    });

    const html = await response.text();
    expect(html).toContain("ДЕМО · НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ ДОКУМЕНТОМ");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("returns not-found for another student or an invalid id", async () => {
    findRequestMock.mockResolvedValue(null);

    expect((await getDocument()).status).toBe(404);
    expect(findRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicId, studentId: 20, status: "READY" },
      }),
    );

    const response = await GET(
      new Request("https://digital-dean.test/api/requests/not-an-id/document"),
      { params: Promise.resolve({ publicId: "not-an-id" }) },
    );
    expect(response.status).toBe(404);
    expect(findRequestMock).toHaveBeenCalledTimes(1);
  });
});

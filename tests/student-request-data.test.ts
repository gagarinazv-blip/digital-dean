import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, requireStudentMock, findManyMock, findFirstMock } =
  vi.hoisted(() => ({
    notFoundMock: vi.fn(),
    requireStudentMock: vi.fn(),
    findManyMock: vi.fn(),
    findFirstMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/student", () => ({
  requireStudent: requireStudentMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    request: {
      findMany: findManyMock,
      findFirst: findFirstMock,
    },
  })),
}));

import {
  getStudentRequest,
  getStudentRequests,
} from "../src/lib/student-request-data";

beforeEach(() => {
  vi.clearAllMocks();
  requireStudentMock.mockResolvedValue({ id: 20 });
  findManyMock.mockResolvedValue([]);
  findFirstMock.mockResolvedValue(null);
  notFoundMock.mockImplementation(() => {
    throw new Error("Not found");
  });
});

describe("student request access", () => {
  it("limits the list to the signed-in student's own requests", async () => {
    await getStudentRequests();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 20 },
      }),
    );
  });

  it("loads only public comments for an owned request", async () => {
    findFirstMock.mockResolvedValue({ id: 123 });

    await getStudentRequest("123");

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 123, studentId: 20 },
        select: expect.objectContaining({
          comments: expect.objectContaining({
            where: { visibility: "PUBLIC" },
          }),
        }),
      }),
    );
  });

  it("returns not-found for malformed or foreign request IDs", async () => {
    await expect(getStudentRequest("invalid")).rejects.toThrow("Not found");
    expect(findFirstMock).not.toHaveBeenCalled();

    await expect(getStudentRequest("456")).rejects.toThrow("Not found");
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 456, studentId: 20 },
      }),
    );
  });
});

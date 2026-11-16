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
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("loads only public comments for an owned request", async () => {
    findFirstMock.mockResolvedValue({ id: 123 });

    await getStudentRequest("b08f54cf-99ce-4a56-a780-8e22ce5ba0a1");

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
          studentId: 20,
        },
        select: expect.objectContaining({
          statusHistory: expect.objectContaining({
            orderBy: [{ changedAt: "asc" }, { id: "asc" }],
          }),
          comments: expect.objectContaining({
            where: { visibility: "PUBLIC" },
            select: expect.objectContaining({
              attachments: {
                select: expect.objectContaining({ kind: true }),
              },
            }),
          }),
        }),
      }),
    );
  });

  it("returns not-found for malformed or foreign public IDs", async () => {
    await expect(getStudentRequest("invalid")).rejects.toThrow("Not found");
    expect(findFirstMock).not.toHaveBeenCalled();

    await expect(
      getStudentRequest("4f4a8f8e-f3ef-4f34-a65e-b9e3cb279ce0"),
    ).rejects.toThrow("Not found");
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicId: "4f4a8f8e-f3ef-4f34-a65e-b9e3cb279ce0",
          studentId: 20,
        },
      }),
    );
  });
});

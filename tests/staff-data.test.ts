import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, requireStaffMock, findManyMock, findFirstMock } =
  vi.hoisted(() => ({
    notFoundMock: vi.fn(),
    requireStaffMock: vi.fn(),
    findManyMock: vi.fn(),
    findFirstMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/staff", () => ({
  requireStaff: requireStaffMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    request: {
      findMany: findManyMock,
      findFirst: findFirstMock,
    },
  })),
}));

import { getStaffRequest, getStaffRequests } from "../src/lib/staff-data";

beforeEach(() => {
  vi.clearAllMocks();
  requireStaffMock.mockResolvedValue({
    id: 40,
    department: "Учебный отдел",
  });
  findManyMock.mockResolvedValue([]);
  findFirstMock.mockResolvedValue(null);
  notFoundMock.mockImplementation(() => {
    throw new Error("Not found");
  });
});

describe("staff request access", () => {
  it("limits the list to assigned requests and unassigned allowed types", async () => {
    await getStaffRequests();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { assignedToId: 40 },
            { assignedToId: null, type: { in: ["CERTIFICATE"] } },
          ],
        },
      }),
    );
  });

  it("returns not-found for a request outside the staff member's access", async () => {
    await expect(getStaffRequest("123")).rejects.toThrow("Not found");

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 123,
          OR: [
            { assignedToId: 40 },
            { assignedToId: null, type: { in: ["CERTIFICATE"] } },
          ],
        },
      }),
    );
  });

  it("does not query for malformed request ids", async () => {
    await expect(getStaffRequest("0")).rejects.toThrow("Not found");

    expect(findFirstMock).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  notFoundMock,
  requireStaffMock,
  requireStaffContextMock,
  findManyMock,
  findFirstMock,
  groupByMock,
} = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  requireStaffMock: vi.fn(),
  requireStaffContextMock: vi.fn(),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  groupByMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/staff", () => ({
  requireStaff: requireStaffMock,
  requireStaffContext: requireStaffContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    request: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      groupBy: groupByMock,
    },
  })),
}));

import {
  getStaffRequest,
  getStaffRequestList,
  getStaffRequests,
} from "../src/lib/staff-data";

beforeEach(() => {
  vi.clearAllMocks();
  requireStaffMock.mockResolvedValue({
    id: 40,
    department: "Учебный отдел",
  });
  requireStaffContextMock.mockResolvedValue({
    staff: { id: 40, department: "Учебный отдел" },
  });
  findManyMock.mockResolvedValue([]);
  findFirstMock.mockResolvedValue(null);
  groupByMock.mockResolvedValue([]);
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

  it("filters the list on the server while counting every accessible status", async () => {
    groupByMock.mockResolvedValue([
      { status: "NEW", _count: { _all: 4 } },
      { status: "READY", _count: { _all: 2 } },
    ]);

    const result = await getStaffRequestList("READY");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { assignedToId: 40 },
                { assignedToId: null, type: { in: ["CERTIFICATE"] } },
              ],
            },
            { status: "READY" },
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          type: true,
          catalogCode: true,
          status: true,
          createdAt: true,
          student: {
            select: {
              fullName: true,
              group: { select: { name: true } },
            },
          },
        },
      }),
    );
    expect(groupByMock).toHaveBeenCalledWith({
      by: ["status"],
      where: {
        OR: [
          { assignedToId: 40 },
          { assignedToId: null, type: { in: ["CERTIFICATE"] } },
        ],
      },
      _count: { _all: true },
    });
    expect(result.counts).toMatchObject({ NEW: 4, READY: 2, REJECTED: 0 });
    expect(result.selectedStatus).toBe("READY");
  });
});

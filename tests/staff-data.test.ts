import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  notFoundMock,
  requireStaffMock,
  requireStaffContextMock,
  findManyMock,
  findFirstMock,
  groupByMock,
  staffProfileFindManyMock,
} = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  requireStaffMock: vi.fn(),
  requireStaffContextMock: vi.fn(),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  groupByMock: vi.fn(),
  staffProfileFindManyMock: vi.fn(),
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
    staffProfile: { findMany: staffProfileFindManyMock },
  })),
}));

vi.mock("@/lib/demo-date", () => ({
  getDemoNow: () => new Date("2026-11-21T18:00:00.000Z"),
}));

import {
  getStaffRequest,
  getStaffRequestList,
  getStaffRequestDetails,
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
  staffProfileFindManyMock.mockResolvedValue([]);
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
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          publicId: true,
          type: true,
          catalogCode: true,
          formSchemaSnapshot: true,
          status: true,
          createdAt: true,
          student: {
            select: {
              fullName: true,
              group: { select: { name: true } },
            },
          },
          assignedTo: { select: { fullName: true } },
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

  it("applies the search and date range without changing the status counts", async () => {
    await getStaffRequestList("NEW", "  AB12  ", "week");

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
            { status: "NEW" },
            {
              OR: [
                { publicId: { contains: "AB12", mode: "insensitive" } },
                {
                  student: {
                    fullName: { contains: "AB12", mode: "insensitive" },
                  },
                },
              ],
            },
            { createdAt: { gte: new Date("2026-11-14T21:00:00.000Z") } },
          ],
        },
      }),
    );
    expect(groupByMock).toHaveBeenCalledWith(
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

  it("loads assignment history and staff-only choices for staff.manager", async () => {
    const request = { id: 123, assignmentHistory: [] };
    const staffMembers = [{ id: 40, fullName: "Сотрудник" }];
    requireStaffContextMock.mockResolvedValue({
      staff: { id: 42, department: "Учебный отдел", isSupervisor: true },
      isManagerAccount: true,
    });
    findFirstMock.mockResolvedValue(request);
    staffProfileFindManyMock.mockResolvedValue(staffMembers);

    await expect(getStaffRequestDetails("123")).resolves.toMatchObject({
      request,
      isManagerAccount: true,
      staffMembers,
    });

    expect(staffProfileFindManyMock).toHaveBeenCalledWith({
      where: { user: { is: { role: "STAFF" } } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    });
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 123 },
        select: expect.objectContaining({
          assignedTo: { select: { id: true, fullName: true } },
          assignmentHistory: expect.objectContaining({
            select: expect.objectContaining({
              fromAssignedTo: { select: { fullName: true } },
              toAssignedTo: { select: { fullName: true } },
            }),
          }),
        }),
      }),
    );
  });
});

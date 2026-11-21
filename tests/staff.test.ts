import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  forbiddenMock,
  notFoundMock,
  redirectMock,
  getCurrentUserMock,
  findStaffProfileMock,
} = vi.hoisted(() => ({
  forbiddenMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  findStaffProfileMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  forbidden: forbiddenMock,
  notFound: notFoundMock,
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    staffProfile: { findUnique: findStaffProfileMock },
  })),
}));

import { requireStaff, requireStaffContext } from "../src/lib/staff";

const staffProfile = {
  id: 40,
  fullName: "Вымышленная Сотрудница",
  position: "специалист",
  department: "Учебный отдел",
  isSupervisor: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({
    id: 10,
    login: "staff.demo",
    role: "STAFF",
    student: null,
  });
  findStaffProfileMock.mockResolvedValue(staffProfile);
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirected to ${path}`);
  });
  forbiddenMock.mockImplementation(() => {
    throw new Error("Forbidden");
  });
  notFoundMock.mockImplementation(() => {
    throw new Error("Not found");
  });
});

describe("requireStaff", () => {
  it("redirects unauthenticated visitors without querying staff data", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(requireStaff()).rejects.toThrow(
      "Redirected to /login?role=staff",
    );
    expect(redirectMock).toHaveBeenCalledWith("/login?role=staff");
    expect(findStaffProfileMock).not.toHaveBeenCalled();
  });

  it("forbids students without querying staff data", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 10,
      login: "student.alpha",
      role: "STUDENT",
      student: null,
    });

    await expect(requireStaff()).rejects.toThrow("Forbidden");

    expect(forbiddenMock).toHaveBeenCalledOnce();
    expect(findStaffProfileMock).not.toHaveBeenCalled();
  });

  it("loads the staff profile using only the authenticated user id", async () => {
    await expect(requireStaff()).resolves.toEqual(staffProfile);

    expect(findStaffProfileMock).toHaveBeenCalledWith({
      where: { userId: 10 },
      select: {
        id: true,
        fullName: true,
        position: true,
        department: true,
        isSupervisor: true,
      },
    });
  });

  it("returns not-found if a staff user has no profile", async () => {
    findStaffProfileMock.mockResolvedValue(null);

    await expect(requireStaff()).rejects.toThrow("Not found");

    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("recognizes only the staff.manager login as the assignment manager", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 12,
      login: "staff.manager",
      role: "STAFF",
      student: null,
    });
    findStaffProfileMock.mockResolvedValue({
      ...staffProfile,
      isSupervisor: true,
    });

    await expect(requireStaffContext()).resolves.toMatchObject({
      userId: 12,
      isManagerAccount: true,
    });

    getCurrentUserMock.mockResolvedValue({
      id: 13,
      login: "staff.other",
      role: "STAFF",
      student: null,
    });

    await expect(requireStaffContext()).resolves.toMatchObject({
      isManagerAccount: false,
    });
  });
});

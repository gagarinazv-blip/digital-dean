import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  forbiddenMock,
  notFoundMock,
  redirectMock,
  getCurrentUserMock,
  findStudentMock,
} = vi.hoisted(() => ({
  forbiddenMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  findStudentMock: vi.fn(),
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
    student: { findUnique: findStudentMock },
  })),
}));

import { requireStudent } from "../src/lib/student";

const student = {
  id: 20,
  fullName: "Вымышленная Студентка",
  faculty: "Факультет демонстрационных данных",
  direction: "Учебное направление",
  course: 2,
  group: { id: 5, name: "DEMO-ALPHA" },
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({
    id: 10,
    login: "student.alpha",
    role: "STUDENT",
    student: null,
  });
  findStudentMock.mockResolvedValue(student);
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

describe("requireStudent", () => {
  it("queries only the student linked to the authenticated session user", async () => {
    await expect(requireStudent()).resolves.toEqual(student);

    expect(getCurrentUserMock).toHaveBeenCalledOnce();
    expect(findStudentMock).toHaveBeenCalledWith({
      where: { userId: 10 },
      select: {
        id: true,
        fullName: true,
        faculty: true,
        direction: true,
        course: true,
        group: {
          select: { id: true, name: true },
        },
      },
    });
    expect(requireStudent).toHaveLength(0);
  });

  it("redirects unauthenticated visitors without querying student data", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(requireStudent()).rejects.toThrow("Redirected to /login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(findStudentMock).not.toHaveBeenCalled();
  });

  it("forbids staff without querying student data", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 10,
      login: "staff.demo",
      role: "STAFF",
      student: null,
    });

    await expect(requireStudent()).rejects.toThrow("Forbidden");

    expect(forbiddenMock).toHaveBeenCalledOnce();
    expect(findStudentMock).not.toHaveBeenCalled();
  });

  it("returns not-found if the authenticated user has no student record", async () => {
    findStudentMock.mockResolvedValue(null);

    await expect(requireStudent()).rejects.toThrow("Not found");

    expect(notFoundMock).toHaveBeenCalledOnce();
  });
});

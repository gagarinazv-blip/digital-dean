import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStudentContextMock, findDatasetMock } = vi.hoisted(() => ({
  requireStudentContextMock: vi.fn(),
  findDatasetMock: vi.fn(),
}));

vi.mock("@/lib/student", () => ({
  requireStudentContext: requireStudentContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    academicDataset: { findUnique: findDatasetMock },
  })),
}));

import { getAcademicRecords } from "../src/lib/academic-records";

beforeEach(() => {
  vi.clearAllMocks();
  requireStudentContextMock.mockResolvedValue({
    userId: 7,
    login: "student.alpha",
    student: {
      id: 42,
      fullName: "Елизавета Воронцова",
      faculty: "Факультет прикладных вычислений",
      direction: "Прикладная информатика",
      course: 3,
      recordBookNumber: "ЗК-26-031",
      studyForm: "FULL_TIME",
      group: { id: 8, name: "TEST-ACADEMIC-31" },
    },
  });
  findDatasetMock.mockResolvedValue(null);
});

describe("getAcademicRecords", () => {
  it("limits the academic dataset query to the authenticated student", async () => {
    const records = await getAcademicRecords();

    expect(requireStudentContextMock).toHaveBeenCalledOnce();
    expect(findDatasetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "academic-records-demo" },
        select: expect.objectContaining({
          semesters: expect.objectContaining({
            where: { studentId: 42 },
          }),
        }),
      }),
    );
    expect(records.student.recordBookNumber).toBe("ЗК-26-031");
    expect(records.login).toBe("student.alpha");
    expect(records.dataset).toBeNull();
  });

  it("uses the current session's student id for every academic query", async () => {
    requireStudentContextMock.mockResolvedValueOnce({
      userId: 7,
      login: "student.alpha",
      student: {
        id: 42,
        fullName: "Елизавета Воронцова",
        faculty: "Факультет прикладных вычислений",
        direction: "Прикладная информатика",
        course: 3,
        recordBookNumber: "ЗК-26-031",
        studyForm: "FULL_TIME",
        group: { id: 8, name: "TEST-ACADEMIC-31" },
      },
    });
    requireStudentContextMock.mockResolvedValueOnce({
      userId: 8,
      login: "student.beta",
      student: {
        id: 43,
        fullName: "Даниил Климов",
        faculty: "Факультет прикладных вычислений",
        direction: "Прикладная информатика",
        course: 3,
        recordBookNumber: "ЗК-26-047",
        studyForm: "FULL_TIME",
        group: { id: 9, name: "TEST-ACADEMIC-32" },
      },
    });

    await getAcademicRecords();
    await getAcademicRecords();

    expect(
      findDatasetMock.mock.calls.map(
        ([query]) => query.select.semesters.where.studentId,
      ),
    ).toEqual([42, 43]);
  });
});

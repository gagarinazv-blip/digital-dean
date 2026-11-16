import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStudentMock, findDatasetMock } = vi.hoisted(() => ({
  requireStudentMock: vi.fn(),
  findDatasetMock: vi.fn(),
}));

vi.mock("@/lib/student", () => ({
  requireStudent: requireStudentMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    academicDataset: { findUnique: findDatasetMock },
  })),
}));

import { getAcademicRecords } from "../src/lib/academic-records";

beforeEach(() => {
  vi.clearAllMocks();
  requireStudentMock.mockResolvedValue({
    id: 42,
    fullName: "Елизавета Воронцова",
    faculty: "Факультет прикладных вычислений",
    direction: "Прикладная информатика",
    course: 3,
    recordBookNumber: "ЗК-26-031",
    studyForm: "FULL_TIME",
    group: { id: 8, name: "TEST-ACADEMIC-31" },
  });
  findDatasetMock.mockResolvedValue(null);
});

describe("getAcademicRecords", () => {
  it("limits the academic dataset query to the authenticated student", async () => {
    const records = await getAcademicRecords();

    expect(requireStudentMock).toHaveBeenCalledOnce();
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
    expect(records.dataset).toBeNull();
  });
});

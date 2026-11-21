import "server-only";

import { getPrisma } from "@/lib/prisma";
import { requireStudentContext } from "@/lib/student";

export async function getAcademicRecords() {
  const { login, student } = await requireStudentContext();
  const dataset = await getPrisma().academicDataset.findUnique({
    where: { id: "academic-records-demo" },
    select: {
      academicYear: true,
      snapshotDate: true,
      semesters: {
        where: { studentId: student.id },
        orderBy: { number: "asc" },
        select: {
          id: true,
          code: true,
          number: true,
          name: true,
          isCurrent: true,
          planItems: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              department: true,
              teacher: true,
              hours: true,
              credits: true,
              controlType: true,
              result: {
                select: {
                  status: true,
                  value: true,
                  date: true,
                  attemptCount: true,
                  attempts: {
                    orderBy: { attemptNumber: "asc" },
                    select: {
                      id: true,
                      attemptNumber: true,
                      date: true,
                      value: true,
                    },
                  },
                },
              },
              sessions: {
                orderBy: [{ date: "asc" }, { startTime: "asc" }],
                select: {
                  id: true,
                  date: true,
                  startTime: true,
                  endTime: true,
                  room: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return { login, student, dataset };
}

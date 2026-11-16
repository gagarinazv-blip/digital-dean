import "server-only";

import { getPrisma } from "@/lib/prisma";
import { getNearestDeadlines } from "@/lib/deadline-utils";

export async function getStudentDeadlines(studentId: number) {
  return getPrisma().deadline.findMany({
    where: { studentId },
    orderBy: [{ dueAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      subject: true,
      title: true,
      dueAt: true,
      status: true,
      description: true,
    },
  });
}

export async function getNearestStudentDeadlines(
  studentId: number,
  limit = 5,
) {
  const deadlines = await getPrisma().deadline.findMany({
    where: { studentId, status: "OPEN" },
    orderBy: [{ dueAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      subject: true,
      title: true,
      dueAt: true,
      status: true,
      description: true,
    },
  });

  return getNearestDeadlines(deadlines, limit);
}

import "server-only";

import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { parsePositiveIntegerId } from "@/lib/request-workflow";

const requestListSelection = {
  id: true,
  type: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const requestDetailSelection = {
  ...requestListSelection,
  comments: {
    where: { visibility: "PUBLIC" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          role: true,
          student: { select: { fullName: true } },
          staffProfile: { select: { fullName: true } },
        },
      },
      attachments: {
        select: {
          id: true,
          fileName: true,
          mediaType: true,
          sizeBytes: true,
        },
      },
    },
  },
} as const;

export async function getStudentRequests() {
  const student = await requireStudent();

  return getPrisma().request.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    select: requestListSelection,
  });
}

export async function getStudentRequest(requestId: string) {
  const student = await requireStudent();
  const id = parsePositiveIntegerId(requestId);
  if (id === null) {
    notFound();
  }

  const request = await getPrisma().request.findFirst({
    where: { id, studentId: student.id },
    select: requestDetailSelection,
  });

  if (!request) {
    notFound();
  }

  return request;
}

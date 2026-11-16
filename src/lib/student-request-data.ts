import "server-only";

import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { isRequestPublicId } from "@/lib/request-workflow";

const requestListSelection = {
  id: true,
  publicId: true,
  type: true,
  catalogCode: true,
  comment: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const requestDetailSelection = {
  ...requestListSelection,
  formFields: true,
  profileSnapshot: true,
  statusHistory: {
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
    select: {
      status: true,
      changedAt: true,
      comment: true,
      author: {
        select: {
          student: { select: { fullName: true } },
          staffProfile: { select: { fullName: true } },
        },
      },
    },
  },
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
} satisfies Prisma.RequestSelect;

export async function getStudentRequests() {
  const student = await requireStudent();

  return getPrisma().request.findMany({
    where: { studentId: student.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: requestListSelection,
  });
}

export async function getStudentRequest(requestId: string) {
  const student = await requireStudent();
  if (!isRequestPublicId(requestId)) {
    notFound();
  }

  const request = await getPrisma().request.findFirst({
    where: { publicId: requestId, studentId: student.id },
    select: requestDetailSelection,
  });

  if (!request) {
    notFound();
  }

  return request;
}

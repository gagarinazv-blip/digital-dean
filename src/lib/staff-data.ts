import "server-only";

import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { requireStaff, requireStaffContext } from "@/lib/staff";
import {
  getStaffRequestFilter,
  parsePositiveIntegerId,
} from "@/lib/request-workflow";

const requestListSelection = {
  id: true,
  type: true,
  catalogCode: true,
  status: true,
  assignedToId: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      fullName: true,
      course: true,
      group: { select: { name: true } },
    },
  },
} as const;

const requestDetailSelection = {
  id: true,
  type: true,
  catalogCode: true,
  formFields: true,
  profileSnapshot: true,
  status: true,
  comment: true,
  assignedToId: true,
  createdAt: true,
  updatedAt: true,
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
  student: {
    select: {
      fullName: true,
      course: true,
      group: { select: { name: true } },
    },
  },
  comments: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      visibility: true,
      createdAt: true,
      author: {
        select: {
          role: true,
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

export async function getStaffRequests() {
  const staff = await requireStaff();

  return getPrisma().request.findMany({
    where: getStaffRequestFilter(staff),
    orderBy: { updatedAt: "desc" },
    select: requestListSelection,
  });
}

export async function getStaffRequestList() {
  const { staff } = await requireStaffContext();
  const requests = await getPrisma().request.findMany({
    where: getStaffRequestFilter(staff),
    orderBy: { updatedAt: "desc" },
    select: requestListSelection,
  });

  return { staff, requests };
}

export async function getStaffRequest(requestId: string) {
  const staff = await requireStaff();
  const id = parsePositiveIntegerId(requestId);
  if (id === null) {
    notFound();
  }

  const request = await getPrisma().request.findFirst({
    where: {
      id,
      ...getStaffRequestFilter(staff),
    },
    select: requestDetailSelection,
  });

  if (!request) {
    notFound();
  }

  return request;
}

export async function getStaffRequestDetails(requestId: string) {
  const { staff } = await requireStaffContext();
  const id = parsePositiveIntegerId(requestId);
  if (id === null) {
    notFound();
  }

  const prisma = getPrisma();
  const request = await prisma.request.findFirst({
    where: {
      id,
      ...getStaffRequestFilter(staff),
    },
    select: requestDetailSelection,
  });

  if (!request) {
    notFound();
  }

  return { request, staff };
}

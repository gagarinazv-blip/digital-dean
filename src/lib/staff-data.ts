import "server-only";

import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { requireStaff, requireStaffContext } from "@/lib/staff";
import { getDemoNow } from "@/lib/demo-date";
import { getMoscowDateKey } from "@/lib/campus-time";
import {
  getStaffRequestFilter,
  getStaffRequestListFilter,
  parsePositiveIntegerId,
} from "@/lib/request-workflow";
import type { RequestStatus } from "@/generated/prisma/enums";

const requestListSelection = {
  id: true,
  publicId: true,
  type: true,
  catalogCode: true,
  status: true,
  createdAt: true,
  student: {
    select: {
      fullName: true,
      group: { select: { name: true } },
    },
  },
  assignedTo: {
    select: { fullName: true },
  },
} satisfies Prisma.RequestSelect;

const requestStatusCounts: Record<RequestStatus, number> = {
  NEW: 0,
  IN_PROGRESS: 0,
  NEEDS_INFO: 0,
  READY: 0,
  REJECTED: 0,
  CANCELLED: 0,
};

const requestDetailSelection = {
  id: true,
  publicId: true,
  type: true,
  catalogCode: true,
  formFields: true,
  profileSnapshot: true,
  status: true,
  comment: true,
  assignedToId: true,
  assignedTo: {
    select: { id: true, fullName: true },
  },
  createdAt: true,
  updatedAt: true,
  statusHistory: {
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
    select: {
      fromStatus: true,
      status: true,
      isRollback: true,
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
  assignmentHistory: {
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
    select: {
      fromAssignedTo: { select: { fullName: true } },
      toAssignedTo: { select: { fullName: true } },
      changedAt: true,
      changedBy: {
        select: {
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

export async function getStaffRequestList(
  rawStatus?: string | string[],
  rawSearch?: string | string[],
  rawDateFilter?: string | string[],
) {
  const { staff } = await requireStaffContext();
  const prisma = getPrisma();
  const searchTerm =
    typeof rawSearch === "string" ? rawSearch.trim().slice(0, 100) : "";
  const dateFilter =
    rawDateFilter === "today" || rawDateFilter === "week"
      ? rawDateFilter
      : "all";
  let createdAtGte: Date | undefined;
  if (dateFilter !== "all") {
    const date = new Date(`${getMoscowDateKey(getDemoNow())}T12:00:00.000Z`);
    if (dateFilter === "week") {
      date.setUTCDate(date.getUTCDate() - 6);
    }
    createdAtGte = new Date(
      `${date.toISOString().slice(0, 10)}T00:00:00.000+03:00`,
    );
  }
  const { status, where } = getStaffRequestListFilter(staff, rawStatus, {
    ...(searchTerm ? { search: searchTerm } : {}),
    ...(createdAtGte ? { createdAtGte } : {}),
  });
  const accessFilter = staff.isSupervisor ? {} : getStaffRequestFilter(staff);
  const [requests, groupedCounts] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: requestListSelection,
    }),
    prisma.request.groupBy({
      by: ["status"],
      where: accessFilter,
      _count: { _all: true },
    }),
  ]);
  const counts = { ...requestStatusCounts };
  for (const { status: requestStatus, _count } of groupedCounts) {
    counts[requestStatus] = _count._all;
  }

  return { requests, counts, selectedStatus: status, searchTerm, dateFilter };
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
  const { staff, isManagerAccount } = await requireStaffContext();
  const id = parsePositiveIntegerId(requestId);
  if (id === null) {
    notFound();
  }

  const prisma = getPrisma();
  const [request, staffMembers] = await Promise.all([
    prisma.request.findFirst({
      where: {
        id,
        ...(staff.isSupervisor ? {} : getStaffRequestFilter(staff)),
      },
      select: requestDetailSelection,
    }),
    isManagerAccount
      ? prisma.staffProfile.findMany({
          where: { user: { is: { role: "STAFF" } } },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
  ]);

  if (!request) {
    notFound();
  }

  return { request, staff, isManagerAccount, staffMembers };
}

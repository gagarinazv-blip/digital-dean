import type { RequestStatus, RequestType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  canStaffChangeStatus,
  canStaffRollbackRequest,
  canStaffReadRequest,
  canStudentCancelRequest,
  canTransitionRequestStatus,
  getAllowedRequestTransitions,
  getStaffRequestFilter,
} from "@/lib/permissions";

export {
  canStaffChangeStatus,
  canStaffRollbackRequest,
  canTransitionRequestStatus,
  canStudentCancelRequest,
  getAllowedRequestTransitions,
  getStaffRequestFilter,
};
export const canStaffAccessRequest = canStaffReadRequest;

export type StaffRequestAccess = {
  id: number;
  department: string;
  isSupervisor?: boolean;
};

export function isRequestType(value: string): value is RequestType {
  return (
    value === "CERTIFICATE" || value === "APPLICATION" || value === "OTHER"
  );
}

export function isRequestStatus(value: string): value is RequestStatus {
  return (
    value === "NEW" ||
    value === "IN_PROGRESS" ||
    value === "NEEDS_INFO" ||
    value === "READY" ||
    value === "REJECTED" ||
    value === "CANCELLED"
  );
}

export function getStaffRequestListFilter(
  staff: StaffRequestAccess,
  rawStatus: unknown,
  filters: { search?: string; createdAtGte?: Date } = {},
) {
  const accessFilter = staff.isSupervisor ? {} : getStaffRequestFilter(staff);
  const status =
    typeof rawStatus === "string" && isRequestStatus(rawStatus)
      ? rawStatus
      : null;
  const conditions: Prisma.RequestWhereInput[] = [accessFilter];

  if (status) {
    conditions.push({ status });
  }
  if (filters.search) {
    conditions.push({
      OR: [
        { publicId: { contains: filters.search, mode: "insensitive" } },
        {
          student: {
            fullName: { contains: filters.search, mode: "insensitive" },
          },
        },
      ],
    });
  }
  if (filters.createdAtGte) {
    conditions.push({ createdAt: { gte: filters.createdAtGte } });
  }

  return {
    status,
    where: conditions.length === 1 ? accessFilter : { AND: conditions },
  };
}

export function parsePositiveIntegerId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function isRequestPublicId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function getAllowedStaffRequestTransitions(
  status: RequestStatus,
): readonly RequestStatus[] {
  return getAllowedRequestTransitions(status).filter(
    (nextStatus) => nextStatus !== "CANCELLED",
  );
}

export type RequestStatusHistoryEntry = {
  fromStatus: RequestStatus | null;
  status: RequestStatus;
  isRollback: boolean;
};

export function getPreviousRequestStatus(
  history: readonly RequestStatusHistoryEntry[],
  currentStatus: RequestStatus,
): RequestStatus | null {
  const previousStatuses: RequestStatus[] = [];
  let replayedStatus: RequestStatus | null = null;

  for (const entry of history) {
    if (entry.fromStatus === null) {
      if (replayedStatus !== null) {
        return null;
      }
      replayedStatus = entry.status;
      continue;
    }

    if (replayedStatus !== entry.fromStatus) {
      return null;
    }

    if (entry.isRollback) {
      const previousStatus = previousStatuses.pop();
      if (
        previousStatus !== entry.status ||
        !canTransitionRequestStatus(entry.status, entry.fromStatus)
      ) {
        return null;
      }
    } else {
      if (!canTransitionRequestStatus(entry.fromStatus, entry.status)) {
        return null;
      }
      previousStatuses.push(entry.fromStatus);
    }

    replayedStatus = entry.status;
  }

  if (replayedStatus !== currentStatus) {
    return null;
  }

  const previousStatus = previousStatuses.at(-1) ?? null;
  return previousStatus !== null &&
    canTransitionRequestStatus(previousStatus, currentStatus)
    ? previousStatus
    : null;
}


import type { RequestStatus, RequestType } from "@/generated/prisma/enums";
import {
  canStaffChangeStatus,
  canStaffReadRequest,
  canStudentCancelRequest,
  canTransitionRequestStatus,
  getAllowedRequestTransitions,
  getStaffRequestFilter,
} from "@/lib/permissions";

export {
  canStaffChangeStatus,
  canTransitionRequestStatus,
  canStudentCancelRequest,
  getAllowedRequestTransitions,
  getStaffRequestFilter,
};
export const canStaffAccessRequest = canStaffReadRequest;

export type StaffRequestAccess = {
  id: number;
  department: string;
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
) {
  const accessFilter = getStaffRequestFilter(staff);
  const status =
    typeof rawStatus === "string" && isRequestStatus(rawStatus)
      ? rawStatus
      : null;

  return {
    status,
    where: status
      ? {
          AND: [accessFilter, { status }],
        }
      : accessFilter,
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


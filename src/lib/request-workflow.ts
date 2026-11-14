import type { RequestStatus, RequestType } from "@/generated/prisma/enums";
import {
  canStaffReadRequest,
  canTransitionRequestStatus,
  getAllowedRequestTransitions,
  getStaffRequestFilter,
} from "@/lib/permissions";

export {
  canTransitionRequestStatus,
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
    value === "REJECTED"
  );
}

export function parsePositiveIntegerId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}


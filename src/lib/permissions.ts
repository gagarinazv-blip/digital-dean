import type { RequestStatus, RequestType } from "@/generated/prisma/enums";

export type StudentPermissionScope = {
  id: number;
};

export type StaffPermissionScope = {
  id: number;
  department: string;
  isSupervisor?: boolean;
};

export type RequestPermissionData = {
  studentId?: number;
  assignedToId: number | null;
  type: RequestType;
  status?: RequestStatus;
};

export const allowedRequestTypesByDepartment: Readonly<
  Record<string, readonly RequestType[]>
> = {
  "Учебный отдел": ["CERTIFICATE"],
  "Отдел по работе со студентами": ["CERTIFICATE"],
};

const requestTransitions: Record<RequestStatus, readonly RequestStatus[]> = {
  NEW: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["NEEDS_INFO", "READY", "REJECTED"],
  NEEDS_INFO: ["IN_PROGRESS"],
  READY: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canStudentReadRequest(
  student: StudentPermissionScope,
  request: RequestPermissionData,
): boolean {
  return request.studentId === student.id;
}

export function canStudentCreateRequest(
  student: StudentPermissionScope,
  requestStudentId: number,
): boolean {
  return requestStudentId === student.id;
}

export function canStudentChangeRequestStatus(): boolean {
  return false;
}

export function canStudentCancelRequest(status: RequestStatus): boolean {
  return requestTransitions[status].includes("CANCELLED");
}

export function canStudentAssignRequest(): boolean {
  return false;
}

export function canStudentReadSchedule(
  studentGroupId: number,
  scheduleGroupId: number,
): boolean {
  return studentGroupId === scheduleGroupId;
}

export function canStudentReadGrades(
  studentId: number,
  gradeStudentId: number,
): boolean {
  return studentId === gradeStudentId;
}

export function canStudentReadStudentProfile(
  studentId: number,
  profileStudentId: number,
): boolean {
  return studentId === profileStudentId;
}

export function canStudentReadUser(): boolean {
  return false;
}

export function canStaffReadRequest(
  staff: StaffPermissionScope,
  request: RequestPermissionData,
): boolean {
  if (request.assignedToId === staff.id) {
    return true;
  }

  return (
    request.assignedToId === null &&
    (allowedRequestTypesByDepartment[staff.department] ?? []).includes(
      request.type,
    )
  );
}

export function canStaffReadRequestAuthorSummary(
  staff: StaffPermissionScope,
  request: RequestPermissionData,
): boolean {
  return canStaffReadRequest(staff, request);
}

export function canStaffTakeRequest(
  staff: StaffPermissionScope,
  request: RequestPermissionData,
): boolean {
  return (
    request.status !== "CANCELLED" &&
    request.assignedToId === null &&
    (allowedRequestTypesByDepartment[staff.department] ?? []).includes(
      request.type,
    )
  );
}

export function canStaffManageAssignedRequest(
  staff: StaffPermissionScope,
  request: RequestPermissionData,
): boolean {
  return request.assignedToId === staff.id;
}

export function canStaffChangeStatus(
  staff: StaffPermissionScope,
  request: RequestPermissionData,
  nextStatus: RequestStatus,
): boolean {
  return (
    nextStatus !== "CANCELLED" &&
    request.status !== undefined &&
    canStaffManageAssignedRequest(staff, request) &&
    requestTransitions[request.status].includes(nextStatus)
  );
}

export function canStaffRollbackRequest(
  staff: StaffPermissionScope,
  request: RequestPermissionData,
): boolean {
  return (
    request.status !== undefined &&
    (staff.isSupervisor === true || canStaffManageAssignedRequest(staff, request))
  );
}

export function canStaffAssignRequest(
  staff: StaffPermissionScope,
  request: RequestPermissionData,
  assigneeId: number,
): boolean {
  return assigneeId === staff.id && canStaffTakeRequest(staff, request);
}

export function canStaffReadSchedule(): boolean {
  return false;
}

export function canStaffReadGrades(): boolean {
  return false;
}

export function canStaffReadStudentProfile(): boolean {
  return false;
}

export function canStaffReadUser(): boolean {
  return false;
}

export function canStaffCreateRequest(): boolean {
  return false;
}

export function canStaffCreateUser(): boolean {
  return false;
}

export function canStaffDeleteUser(): boolean {
  return false;
}

export function getAllowedRequestTransitions(
  status: RequestStatus,
): readonly RequestStatus[] {
  return requestTransitions[status];
}

export function canTransitionRequestStatus(
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  return requestTransitions[from].includes(to);
}

export function getStaffRequestFilter(staff: StaffPermissionScope) {
  const allowedTypes = allowedRequestTypesByDepartment[staff.department] ?? [];
  return {
    OR: [
      { assignedToId: staff.id },
      { assignedToId: null, type: { in: [...allowedTypes] } },
    ],
  };
}

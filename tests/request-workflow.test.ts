import { describe, expect, it } from "vitest";
import {
  canStaffChangeStatus,
  canStaffAccessRequest,
  canStaffRollbackRequest,
  canTransitionRequestStatus,
  getAllowedStaffRequestTransitions,
  getPreviousRequestStatus,
  getStaffRequestFilter,
  getStaffRequestListFilter,
} from "../src/lib/request-workflow";

describe("request status workflow", () => {
  it("allows only the requested status transitions", () => {
    expect(canTransitionRequestStatus("NEW", "IN_PROGRESS")).toBe(true);
    expect(canTransitionRequestStatus("NEW", "CANCELLED")).toBe(true);
    expect(canTransitionRequestStatus("IN_PROGRESS", "NEEDS_INFO")).toBe(true);
    expect(canTransitionRequestStatus("IN_PROGRESS", "READY")).toBe(true);
    expect(canTransitionRequestStatus("IN_PROGRESS", "REJECTED")).toBe(true);
    expect(canTransitionRequestStatus("NEEDS_INFO", "IN_PROGRESS")).toBe(true);
    expect(canTransitionRequestStatus("NEW", "REJECTED")).toBe(false);
    expect(canTransitionRequestStatus("CANCELLED", "IN_PROGRESS")).toBe(false);
    expect(canTransitionRequestStatus("READY", "IN_PROGRESS")).toBe(false);
    expect(getAllowedStaffRequestTransitions("NEW")).toEqual(["IN_PROGRESS"]);
  });

  it("does not allow staff to cancel a NEW request", () => {
    expect(
      canStaffChangeStatus(
        { id: 40, department: "Учебный отдел" },
        { status: "NEW", assignedToId: 40, type: "CERTIFICATE" },
        "CANCELLED",
      ),
    ).toBe(false);
  });

  it("finds the previous active status after one or more rollbacks", () => {
    const history = [
      { fromStatus: null, status: "NEW" as const, isRollback: false },
      { fromStatus: "NEW" as const, status: "IN_PROGRESS" as const, isRollback: false },
      { fromStatus: "IN_PROGRESS" as const, status: "READY" as const, isRollback: false },
      { fromStatus: "READY" as const, status: "IN_PROGRESS" as const, isRollback: true },
    ];

    expect(getPreviousRequestStatus(history, "IN_PROGRESS")).toBe("NEW");
    expect(
      getPreviousRequestStatus(
        [{ fromStatus: null, status: "NEW", isRollback: false }],
        "NEW",
      ),
    ).toBeNull();
  });

  it("does not offer rollback for inconsistent or invalid history", () => {
    expect(
      getPreviousRequestStatus(
        [
          { fromStatus: null, status: "NEW", isRollback: false },
          { fromStatus: "NEW", status: "READY", isRollback: false },
        ],
        "READY",
      ),
    ).toBeNull();
  });
});

describe("staff request scope", () => {
  const regularStaff = {
    id: 40,
    department: "Учебный отдел",
    isSupervisor: false,
  };

  it("limits regular staff to their assignments and unassigned allowed types", () => {
    expect(getStaffRequestFilter(regularStaff)).toEqual({
      OR: [
        { assignedToId: 40 },
        { assignedToId: null, type: { in: ["CERTIFICATE"] } },
      ],
    });
    expect(
      canStaffAccessRequest(regularStaff, {
        assignedToId: 40,
        type: "APPLICATION",
      }),
    ).toBe(true);
    expect(
      canStaffAccessRequest(regularStaff, {
        assignedToId: 41,
        type: "CERTIFICATE",
      }),
    ).toBe(false);
    expect(
      canStaffAccessRequest(regularStaff, {
        assignedToId: null,
        type: "APPLICATION",
      }),
    ).toBe(false);
  });

  it("keeps ordinary permissions scoped while listing all requests for supervisors", () => {
    const supervisor = { ...regularStaff, isSupervisor: true };

    expect(getStaffRequestFilter(supervisor)).toEqual({
      OR: [
        { assignedToId: 40 },
        { assignedToId: null, type: { in: ["CERTIFICATE"] } },
      ],
    });
    expect(getStaffRequestListFilter(supervisor, undefined).where).toEqual({});
    expect(
      canStaffAccessRequest(supervisor, {
        assignedToId: 41,
        type: "APPLICATION",
      }),
    ).toBe(false);
    expect(
      canStaffRollbackRequest(supervisor, {
        assignedToId: 41,
        type: "APPLICATION",
        status: "READY",
      }),
    ).toBe(true);
    expect(
      canStaffRollbackRequest(regularStaff, {
        assignedToId: 41,
        type: "APPLICATION",
        status: "READY",
      }),
    ).toBe(false);
  });
});

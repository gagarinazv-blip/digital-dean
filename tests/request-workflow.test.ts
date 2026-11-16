import { describe, expect, it } from "vitest";
import {
  canStaffChangeStatus,
  canStaffAccessRequest,
  canTransitionRequestStatus,
  getAllowedStaffRequestTransitions,
  getStaffRequestFilter,
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

  it("does not grant supervisors access outside the regular request scope", () => {
    const supervisor = { ...regularStaff, isSupervisor: true };

    expect(getStaffRequestFilter(supervisor)).toEqual({
      OR: [
        { assignedToId: 40 },
        { assignedToId: null, type: { in: ["CERTIFICATE"] } },
      ],
    });
    expect(
      canStaffAccessRequest(supervisor, {
        assignedToId: 41,
        type: "APPLICATION",
      }),
    ).toBe(false);
  });
});

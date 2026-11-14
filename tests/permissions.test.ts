import { describe, expect, it } from "vitest";
import {
  canStaffAssignRequest,
  canStaffChangeStatus,
  canStaffReadGrades,
  canStaffReadRequest,
  canStaffReadRequestAuthorSummary,
  canStaffReadSchedule,
  canStaffReadStudentProfile,
  canStaffReadUser,
  canStaffTakeRequest,
  canStudentAssignRequest,
  canStudentChangeRequestStatus,
  canStudentCreateRequest,
  canStudentReadGrades,
  canStudentReadRequest,
  canStudentReadSchedule,
  canStudentReadStudentProfile,
  canStudentReadUser,
} from "../src/lib/permissions";

describe("MVP permissions", () => {
  const student = { id: 20 };
  const staff = { id: 40, department: "Учебный отдел" };

  it("limits a student to their own requests and records", () => {
    expect(
      canStudentReadRequest(student, {
        studentId: 20,
        assignedToId: null,
        type: "CERTIFICATE",
      }),
    ).toBe(true);
    expect(
      canStudentReadRequest(student, {
        studentId: 21,
        assignedToId: null,
        type: "CERTIFICATE",
      }),
    ).toBe(false);
    expect(canStudentCreateRequest(student, 20)).toBe(true);
    expect(canStudentCreateRequest(student, 21)).toBe(false);
    expect(canStudentReadSchedule(5, 5)).toBe(true);
    expect(canStudentReadSchedule(5, 6)).toBe(false);
    expect(canStudentReadGrades(20, 20)).toBe(true);
    expect(canStudentReadGrades(20, 21)).toBe(false);
    expect(canStudentReadStudentProfile(20, 20)).toBe(true);
    expect(canStudentReadStudentProfile(20, 21)).toBe(false);
    expect(canStudentReadUser()).toBe(false);
    expect(canStudentChangeRequestStatus()).toBe(false);
    expect(canStudentAssignRequest()).toBe(false);
  });

  it("limits staff to assigned or permitted unassigned requests", () => {
    const assignedToStaff = {
      studentId: 20,
      assignedToId: 40,
      type: "APPLICATION" as const,
      status: "IN_PROGRESS" as const,
    };
    const assignedToOther = { ...assignedToStaff, assignedToId: 41 };
    const permittedUnassigned = {
      ...assignedToStaff,
      assignedToId: null,
      type: "CERTIFICATE" as const,
    };
    const unpermittedUnassigned = {
      ...permittedUnassigned,
      type: "APPLICATION" as const,
    };

    expect(canStaffReadRequest(staff, assignedToStaff)).toBe(true);
    expect(canStaffReadRequest(staff, assignedToOther)).toBe(false);
    expect(canStaffReadRequest(staff, permittedUnassigned)).toBe(true);
    expect(canStaffReadRequest(staff, unpermittedUnassigned)).toBe(false);
    expect(canStaffReadRequestAuthorSummary(staff, permittedUnassigned)).toBe(
      true,
    );
    expect(canStaffTakeRequest(staff, permittedUnassigned)).toBe(true);
    expect(canStaffTakeRequest(staff, assignedToStaff)).toBe(false);
    expect(canStaffAssignRequest(staff, permittedUnassigned, 40)).toBe(true);
    expect(canStaffAssignRequest(staff, permittedUnassigned, 41)).toBe(false);
    expect(canStaffChangeStatus(staff, assignedToStaff, "READY")).toBe(true);
    expect(canStaffChangeStatus(staff, assignedToStaff, "REJECTED")).toBe(true);
    expect(canStaffChangeStatus(staff, assignedToStaff, "NEEDS_INFO")).toBe(
      true,
    );
    expect(canStaffChangeStatus(staff, permittedUnassigned, "IN_PROGRESS")).toBe(
      false,
    );
  });

  it("does not grant staff access to student records or user accounts", () => {
    expect(canStaffReadSchedule()).toBe(false);
    expect(canStaffReadGrades()).toBe(false);
    expect(canStaffReadStudentProfile()).toBe(false);
    expect(canStaffReadUser()).toBe(false);
  });
});

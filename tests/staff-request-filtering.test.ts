import { describe, expect, it } from "vitest";
import { getStaffRequestListFilter } from "../src/lib/request-workflow";
import type { RequestStatus } from "../src/generated/prisma/enums";

const requestStatuses: RequestStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "NEEDS_INFO",
  "READY",
  "REJECTED",
  "CANCELLED",
];

describe("staff request list filtering", () => {
  const staff = { id: 40, department: "Учебный отдел" };
  const accessFilter = {
    OR: [
      { assignedToId: 40 },
      { assignedToId: null, type: { in: ["CERTIFICATE"] } },
    ],
  };

  it.each(requestStatuses)(
    "filters by the %s schema status without widening staff access",
    (status) => {
      expect(getStaffRequestListFilter(staff, status)).toEqual({
        status,
        where: {
          AND: [accessFilter, { status }],
        },
      });
    },
  );

  it.each(["UNKNOWN", "", ["NEW"]])(
    "ignores an invalid status value (%s) and keeps existing access checks",
    (status) => {
      expect(getStaffRequestListFilter(staff, status)).toEqual({
        status: null,
        where: accessFilter,
      });
    },
  );

  it("does not grant another department access to unassigned requests", () => {
    expect(
      getStaffRequestListFilter(
        { id: 41, department: "Неизвестный отдел" },
        "NEW",
      ),
    ).toEqual({
      status: "NEW",
      where: {
        AND: [
          {
            OR: [
              { assignedToId: 41 },
              { assignedToId: null, type: { in: [] } },
            ],
          },
          { status: "NEW" },
        ],
      },
    });
  });
});

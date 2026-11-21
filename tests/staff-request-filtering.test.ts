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

  it("combines text and date filters without widening staff access", () => {
    const createdAtGte = new Date("2026-11-15T21:00:00.000Z");

    expect(
      getStaffRequestListFilter(staff, "NEW", {
        search: "ab12",
        createdAtGte,
      }),
    ).toEqual({
      status: "NEW",
      where: {
        AND: [
          accessFilter,
          { status: "NEW" },
          {
            OR: [
              { publicId: { contains: "ab12", mode: "insensitive" } },
              {
                student: {
                  fullName: { contains: "ab12", mode: "insensitive" },
                },
              },
            ],
          },
          { createdAt: { gte: createdAtGte } },
        ],
      },
    });
  });
});

import { describe, expect, it } from "vitest";
import { getStudentListFilters } from "../src/lib/staff-student-filters";

describe("staff student list filters", () => {
  it("combines a name/phone query with validated course, group, and status", () => {
    const result = getStudentListFilters(
      {
        q: " +7 900 ",
        course: "3",
        groupId: "12",
        accountStatus: "ACTIVE",
      },
      [12, 13],
    );

    expect(result).toMatchObject({
      searchTerm: "+7 900",
      course: 3,
      groupId: 12,
      accountStatus: "ACTIVE",
      where: {
        AND: [
          {
            OR: [
              { fullName: { contains: "+7 900", mode: "insensitive" } },
              { phone: { contains: "7900" } },
            ],
          },
          { course: 3 },
          { groupId: 12 },
          { accountStatus: "ACTIVE" },
        ],
      },
    });
  });

  it("ignores invalid and unknown filter values", () => {
    const result = getStudentListFilters(
      { course: "7", groupId: "999", accountStatus: "SUSPENDED" },
      [12],
    );

    expect(result).toMatchObject({
      course: null,
      groupId: null,
      accountStatus: null,
      where: undefined,
    });
  });
});

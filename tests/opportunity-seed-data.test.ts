import { describe, expect, it } from "vitest";
import { opportunitySeeds } from "../prisma/opportunity-seed-data";

describe("opportunity demo seed", () => {
  it("meets the requested category quotas without duplicate titles", () => {
    const counts = opportunitySeeds.reduce<Record<string, number>>(
      (result, seed) => {
        result[seed.type] = (result[seed.type] ?? 0) + 1;
        return result;
      },
      {},
    );

    expect(opportunitySeeds).toHaveLength(40);
    expect(counts).toEqual({
      CLUB: 6,
      CULTURAL: 6,
      SPORT: 8,
      GRANT: 3,
      CASE_CHAMPIONSHIP: 3,
      CONFERENCE: 3,
      COMPETITION: 3,
      INTERNSHIP: 3,
      EXCHANGE: 2,
      VOLUNTEERING: 3,
    });
    expect(new Set(opportunitySeeds.map(({ title }) => title)).size).toBe(40);
  });

  it("includes draft, archived, overdue, and late-request demo cases", () => {
    expect(opportunitySeeds.some((seed) => seed.status === "DRAFT")).toBe(true);
    expect(opportunitySeeds.some((seed) => seed.status === "ARCHIVED")).toBe(
      true,
    );
    expect(opportunitySeeds.some((seed) => seed.offset < 0)).toBe(true);
    expect(
      opportunitySeeds.some(
        (seed) => seed.allowLateRequests && seed.offset < 0,
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  isStudentEligible,
  opportunityDirectionLabels,
  opportunityTypeConfig,
  safeOpportunityReturnTo,
  validateOpportunityDetails,
} from "@/lib/opportunity-catalog";

describe("opportunity catalog types", () => {
  it("defines every opportunity type and direction label", () => {
    expect(Object.keys(opportunityTypeConfig)).toHaveLength(11);
    expect(Object.keys(opportunityDirectionLabels)).toHaveLength(12);
  });

  it("validates type-specific details and ignores unknown fields", () => {
    const result = validateOpportunityDetails("CASE_CHAMPIONSHIP", {
      minTeamSize: "2",
      maxTeamSize: "4",
      duration: "2 дня",
      caseFormat: "Командный кейс",
      language: "Русский",
      ignoredField: "not stored",
    });

    expect(result.errors).toEqual({});
    expect(result.details).toMatchObject({
      minTeamSize: 2,
      maxTeamSize: 4,
      caseFormat: "Командный кейс",
    });
    expect(result.details).not.toHaveProperty("ignoredField");
  });

  it("rejects inconsistent team sizes and invalid additional recruitment", () => {
    const team = validateOpportunityDetails("CASE_CHAMPIONSHIP", {
      minTeamSize: "5",
      maxTeamSize: "3",
      duration: "2 дня",
      caseFormat: "Командный кейс",
      language: "Русский",
    });
    const sport = validateOpportunityDetails("SPORT", {
      section: "Волейбол",
      coach: "Иван Орлов",
      schedule: "Понедельник",
      venue: "Зал 1",
      level: "Любой",
      seats: "12",
      additionalRecruitment: "on",
    });

    expect(team.errors.maxTeamSize).toBeTruthy();
    expect(sport.errors.freeSpots).toBeTruthy();
  });

  it("checks course and faculty restrictions and rejects external return URLs", () => {
    expect(
      isStudentEligible(
        { minCourse: 2, maxCourse: 4, allowedFaculties: ["МО"] },
        { course: 1, faculty: "МО" },
      ).eligible,
    ).toBe(false);
    expect(
      isStudentEligible(
        { minCourse: null, maxCourse: null, allowedFaculties: ["МО"] },
        { course: 3, faculty: "МЭО" },
      ).eligible,
    ).toBe(false);
    expect(safeOpportunityReturnTo("https://example.com")).toBe(
      "/opportunities/catalog",
    );
    expect(safeOpportunityReturnTo("/opportunities/../../login")).toBe(
      "/opportunities/catalog",
    );
    expect(safeOpportunityReturnTo("/opportunities/catalog?type=SPORT")).toBe(
      "/opportunities/catalog?type=SPORT",
    );
  });
});

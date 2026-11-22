import { describe, expect, it } from "vitest";
import {
  applicationAnswersSchema,
  filterOpportunityApplicationAnswers,
  getOpportunityApplicationAnswerInput,
  getOpportunityApplicationFields,
  isStudentEligible,
  opportunityDirectionLabels,
  opportunityTypeConfig,
  safeOpportunityReturnTo,
  validateOpportunityApplicationAnswers,
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

  it("keeps staff event fields separate from student answer fields for every type", () => {
    const expectedEventFields = {
      CONFERENCE: ["topics", "participationFormat", "abstractRequirements", "language"],
      COMPETITION: ["nominations", "prizeFund", "stages"],
      INTERNSHIP: ["company", "duration", "paid", "cityOrRemote", "workload"],
      CASE_CHAMPIONSHIP: ["minTeamSize", "maxTeamSize", "duration", "prizes", "caseFormat", "language"],
      GRANT: ["amount", "period", "criteria", "stages", "minRequirements", "count"],
      EXCHANGE: ["country", "university", "duration", "studyLanguage", "financing", "languageRequirements"],
      CLUB: ["theme", "leader", "schedule", "location", "seats", "admission"],
      CULTURAL: ["ensembleName", "genre", "leader", "rehearsalSchedule", "location", "auditionRequired", "auditionWhen", "seats"],
      SPORT: ["section", "coach", "schedule", "venue", "level", "medicalCertificate", "seats", "additionalRecruitment", "freeSpots"],
      VOLUNTEERING: ["project", "schedule", "hours", "seats"],
      OTHER: [],
    } as const;
    const eventOnlyFieldNames = new Set([
      "topics",
      "abstractRequirements",
      "language",
      "nominations",
      "prizeFund",
      "stages",
      "company",
      "duration",
      "paid",
      "cityOrRemote",
      "workload",
      "minTeamSize",
      "maxTeamSize",
      "prizes",
      "caseFormat",
      "amount",
      "period",
      "criteria",
      "minRequirements",
      "count",
      "country",
      "university",
      "studyLanguage",
      "financing",
      "languageRequirements",
      "theme",
      "leader",
      "schedule",
      "location",
      "seats",
      "admission",
      "ensembleName",
      "genre",
      "rehearsalSchedule",
      "auditionRequired",
      "auditionWhen",
      "section",
      "coach",
      "venue",
      "level",
      "medicalCertificate",
      "additionalRecruitment",
      "freeSpots",
      "project",
      "hours",
    ]);

    for (const [type, eventFields] of Object.entries(expectedEventFields)) {
      const answerNames = applicationAnswersSchema[
        type as keyof typeof applicationAnswersSchema
      ].fields.map((field) => field.name);
      expect(
        opportunityTypeConfig[type as keyof typeof opportunityTypeConfig]
          .opportunityDetailsSchema.map((field) => field.name),
      ).toEqual(eventFields);
      expect(answerNames.filter((name) => eventOnlyFieldNames.has(name))).toEqual([]);
    }
  });

  it("accepts only student answer keys and validates event-backed choices", () => {
    const formData = new FormData();
    formData.set("answer_topic", "Городская дипломатия");
    formData.set("answer_participationFormat", "Доклад");
    formData.set("answer_seats", "100");
    formData.set("studentId", "999");
    formData.set("status", "ACCEPTED");
    formData.set("kind", "LATE_REQUEST");
    formData.set("detail_language", "Японский");
    const fields = getOpportunityApplicationFields("CONFERENCE", {
      eventDetails: { participationFormat: "Доклад, Слушатель" },
    });
    const conference = validateOpportunityApplicationAnswers(
      "CONFERENCE",
      getOpportunityApplicationAnswerInput(formData, fields),
      { eventDetails: { participationFormat: "Доклад, Слушатель" } },
    );

    expect(conference.errors).toEqual({});
    expect(conference.details).toEqual({
      topic: "Городская дипломатия",
      participationFormat: "Доклад",
    });
    expect(conference.details).not.toHaveProperty("seats");
    expect(conference.details).not.toHaveProperty("studentId");
    expect(conference.details).not.toHaveProperty("status");
    expect(conference.details).not.toHaveProperty("kind");
    expect(conference.details).not.toHaveProperty("detail_language");

    const club = validateOpportunityApplicationAnswers("CLUB", {
      motivation: "Хочу участвовать в работе клуба.",
      leader: "Подменённый руководитель",
      seats: "0",
    });
    expect(club.errors).toEqual({});
    expect(club.motivation).toBe("Хочу участвовать в работе клуба.");
    expect(club.details).toEqual({});
  });

  it("enforces conditional audition, team, sport, and portfolio answers", () => {
    const withoutAudition = getOpportunityApplicationFields("CULTURAL", {
      eventDetails: { auditionRequired: false },
    });
    const withAudition = getOpportunityApplicationFields("CULTURAL", {
      eventDetails: { auditionRequired: true },
    });
    expect(withoutAudition.some((field) => field.name === "auditionTime")).toBe(false);
    expect(withAudition.some((field) => field.name === "auditionTime")).toBe(true);
    expect(
      validateOpportunityApplicationAnswers(
        "CULTURAL",
        { motivation: "Хочу вступить." },
        { eventDetails: { auditionRequired: true } },
      ).errors.auditionTime,
    ).toBe("Заполните поле.");

    const team = validateOpportunityApplicationAnswers(
      "CASE_CHAMPIONSHIP",
      { teamName: "Синергия", teamMembers: "Анна — МО-1\nИван — МО-2" },
      { eventDetails: { minTeamSize: 2, maxTeamSize: 2 } },
    );
    expect(team.errors.teamMembers).toContain("не более 1");
    const lookingForTeam = validateOpportunityApplicationAnswers(
      "CASE_CHAMPIONSHIP",
      { teamName: "Синергия", lookingForTeam: "on" },
      { eventDetails: { minTeamSize: 2, maxTeamSize: 4 } },
    );
    expect(lookingForTeam.errors).toEqual({});

    const sport = validateOpportunityApplicationAnswers("SPORT", {
      trainingLevel: "advanced",
      medicalRestrictions: "on",
      medicalRestrictionsDescription: "ignored",
    });
    expect(sport.errors).toEqual({});
    expect(sport.details).toEqual({
      trainingLevel: "advanced",
      medicalRestrictions: true,
    });

    expect(
      validateOpportunityApplicationAnswers(
        "GRANT",
        { researchTopic: "Дипломатия", portfolioItemIds: ["17"] },
        { portfolioItems: [{ id: 8, title: "Работа" }] },
      ).errors.portfolioItemIds,
    ).toBe("Выберите только записи из своего портфолио.");
    expect(
      filterOpportunityApplicationAnswers("CLUB", {
        leader: "не ответ студента",
        seats: 1,
        experience: "Волонтёрство",
      }),
    ).toEqual({ experience: "Волонтёрство" });
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

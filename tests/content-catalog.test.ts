import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getContentDate, getContentWeekDate } from "../prisma/content/dates";
import { digestContent } from "../prisma/content/digest";
import { opportunityContent } from "../prisma/content/opportunities";
import {
  achievementContent,
  announcementContent,
  applicationContent,
  bookmarkContent,
  deadlineContent,
  documentContent,
} from "../prisma/content/student-life";
import {
  EventType,
  OpportunityApplicationStatus,
  OpportunityCost,
  OpportunityDirection,
  OpportunityFormat,
  OpportunityStatus,
  OpportunityType,
  PortfolioCategory,
  PortfolioSource,
} from "../src/generated/prisma/enums";
import { parseEventInput } from "../src/lib/event-validation";
import { validateOpportunityDetails } from "../src/lib/opportunity-catalog";
import { validatePortfolioMetadata } from "../src/lib/portfolio-form";

const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

describe("content catalog", () => {
  it("covers every type of the section", () => {
    expect(sorted(digestContent.map(({ type }) => type))).toEqual(sorted(Object.values(EventType)));
    expect(sorted(opportunityContent.map(({ type }) => type))).toEqual(sorted(Object.values(OpportunityType)));
    expect(sorted(opportunityContent.flatMap(({ directions }) => directions))).toEqual(sorted(Object.values(OpportunityDirection)));
    expect(sorted(opportunityContent.map(({ format }) => format ?? "OFFLINE"))).toEqual(sorted(Object.values(OpportunityFormat)));
    expect(sorted(opportunityContent.map(({ cost }) => cost ?? "FREE"))).toEqual(sorted(Object.values(OpportunityCost)));
    expect(sorted(opportunityContent.map(({ status }) => status ?? "PUBLISHED"))).toEqual(sorted(Object.values(OpportunityStatus)));
    expect(sorted(applicationContent.map(({ status }) => status))).toEqual(sorted(Object.values(OpportunityApplicationStatus)));
    for (const login of ["student.alpha", "student.beta"]) {
      const items = achievementContent.filter((item) => item.login === login);
      expect(sorted(items.map(({ category }) => category))).toEqual(sorted(Object.values(PortfolioCategory)));
      expect(sorted(items.map(({ source }) => source))).toEqual(sorted(Object.values(PortfolioSource)));
    }
    expect(sorted(deadlineContent.map(({ format }) => format))).toEqual(["EXAM", "OFFLINE", "ONLINE"]);
  });

  it("reads like real university life", () => {
    const text = JSON.stringify([
      digestContent,
      opportunityContent,
      achievementContent,
      applicationContent,
      documentContent,
      deadlineContent,
      announcementContent,
    ]);
    expect(text).not.toMatch(/демо(?!нстр)|тестов|(?<![а-яё])пример|вымышл|lorem|demo|example|seed|sample/i);
    expect(text).not.toMatch(/https?:/);
  });

  it("has unique titles", () => {
    for (const titles of [
      digestContent.map(({ title }) => title),
      opportunityContent.map(({ title }) => title),
      achievementContent.map(({ login, title }) => `${login} ${title}`),
      achievementContent.map(({ file }) => file),
      deadlineContent.map(({ login, subject, title }) => `${login} ${subject} ${title}`),
    ]) {
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  it.each(digestContent.map((event) => [event.title, event] as const))(
    "event «%s» passes the form validation",
    (_, event) => {
      expect(
        parseEventInput({
          ...event,
          description: event.description ?? "",
          date: "2026-11-23",
          startsAt: event.from ?? "",
          endsAt: event.to ?? "",
          location: event.location ?? "",
          host: event.host ?? "",
          registrationUrl: "",
          status: event.status ?? "PUBLISHED",
        }).ok,
      ).toBe(true);
      expect(event.day).toBeGreaterThanOrEqual(1);
      expect(event.day).toBeLessThanOrEqual(7);
    },
  );

  it.each(opportunityContent.map((item) => [item.title, item] as const))(
    "opportunity «%s» has complete details",
    (_, item) => {
      const result = validateOpportunityDetails(item.type, item.details as Record<string, unknown>);
      expect(result.errors).toEqual({});
      expect(item.title.length).toBeLessThanOrEqual(120);
      expect(item.shortDescription.length).toBeLessThanOrEqual(200);
      expect((item.costNote ?? "").length).toBeLessThanOrEqual(200);
      expect(item.cost === "PAID").toBe(Boolean(item.costNote));
    },
  );

  it("keeps achievements valid and their files present", () => {
    for (const item of achievementContent) {
      expect(validatePortfolioMetadata({ ...item, eventDate: "2026-01-10" }, true).ok).toBe(true);
    }
    for (const { file } of [...achievementContent, ...documentContent]) {
      const data = readFileSync(path.join(process.cwd(), "prisma/content/files", file));
      expect(data.subarray(0, 5).toString()).toBe("%PDF-");
    }
  });

  it("links applications and bookmarks to existing published opportunities", () => {
    const visible = new Set(
      opportunityContent.filter(({ status }) => status !== "DRAFT").map(({ title }) => title),
    );
    for (const { opportunity } of applicationContent) expect(visible.has(opportunity)).toBe(true);
    for (const title of Object.values(bookmarkContent).flat()) expect(visible.has(title)).toBe(true);
  });

  it("counts dates in Moscow time", () => {
    // 00:30 23 ноября по Москве — уже понедельник новой недели.
    const now = new Date("2026-11-22T21:30:00Z");
    expect(getContentDate(now, 0, "12:00").toISOString()).toBe("2026-11-23T09:00:00.000Z");
    expect(getContentWeekDate(now, 0, 1, "17:30").toISOString()).toBe("2026-11-23T14:30:00.000Z");
    expect(getContentWeekDate(now, 1, 8, "01:00").toISOString()).toBe("2026-12-06T22:00:00.000Z");
  });
});

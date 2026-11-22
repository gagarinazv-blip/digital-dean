import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ event: { findMany } }),
}));

import {
  getDigestWeek,
  groupEventsByStartDay,
} from "@/lib/event-digest";
import { getPublishedDigestEvents } from "@/lib/event-data";
import { getMoscowDateTime } from "@/lib/campus-time";
import { parseEventInput } from "@/lib/event-validation";

describe("event digest week", () => {
  it("uses Monday through Sunday in the Moscow timezone", () => {
    const week = getDigestWeek("2026-11-16", new Date("2026-11-19T12:00:00Z"));

    expect(week.startDate.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(week.startInstant.toISOString()).toBe("2026-11-15T21:00:00.000Z");
    expect(week.endInstant.toISOString()).toBe("2026-11-22T21:00:00.000Z");
  });

  it("falls back to the current week for an invalid week key", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    expect(getDigestWeek("2026-11-17", now).startDate.toISOString()).toBe(
      getDigestWeek(undefined, now).startDate.toISOString(),
    );
  });

  it("groups an overnight event under the day it starts", () => {
    const week = getDigestWeek("2026-11-16");
    const startsAt = getMoscowDateTime(
      new Date("2026-11-16T00:00:00.000Z"),
      new Date("1970-01-01T23:30:00.000Z"),
    );
    const endsAt = getMoscowDateTime(
      new Date("2026-11-17T00:00:00.000Z"),
      new Date("1970-01-01T00:30:00.000Z"),
    );
    const days = groupEventsByStartDay(week, [
      {
        id: 1,
        title: "Ночное мероприятие",
        type: "OTHER",
        description: null,
        startsAt,
        endsAt,
        location: "Аудитория",
        host: "Ведущий",
        registrationUrl: null,
        status: "PUBLISHED",
      },
    ]);

    expect(days[0]?.events).toHaveLength(1);
    expect(days[1]?.events).toHaveLength(0);
  });
});

describe("event form validation", () => {
  const validInput = {
    title: "Встреча",
    type: "SPEAKER_MEETING",
    description: "",
    date: "2026-11-16",
    startsAt: "23:30",
    endsAt: "00:30",
    location: "Аудитория А-1",
    host: "Анна Вересова",
    registrationUrl: "https://example.com/register/1",
    status: "PUBLISHED",
  };

  it("accepts overnight events and converts Moscow wall-clock time to UTC", () => {
    const result = parseEventInput(validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.startsAt.toISOString()).toBe("2026-11-16T20:30:00.000Z");
    expect(result.value.endsAt.toISOString()).toBe("2026-11-16T21:30:00.000Z");
  });

  it("rejects equal start and end times and unsafe registration protocols", () => {
    const equalTimes = parseEventInput({
      ...validInput,
      endsAt: validInput.startsAt,
    });
    const unsafeUrl = parseEventInput({
      ...validInput,
      registrationUrl: "javascript:alert(1)",
    });

    expect(equalTimes.ok).toBe(false);
    expect(unsafeUrl.ok).toBe(false);
    if (!unsafeUrl.ok) {
      expect(unsafeUrl.fieldErrors.registrationUrl).toContain("http");
    }
  });
});

describe("published student events", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("always excludes draft events in the database query", async () => {
    await getPublishedDigestEvents(
      new Date("2026-11-15T21:00:00Z"),
      new Date("2026-11-22T21:00:00Z"),
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PUBLISHED" }),
      }),
    );
  });
});

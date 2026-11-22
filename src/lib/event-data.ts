import "server-only";

import type { Event } from "@/generated/prisma/client";
import type { EventType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import type { DigestEvent } from "@/lib/event-digest";

const eventSelect = {
  id: true,
  title: true,
  type: true,
  description: true,
  eventDate: true,
  startsAt: true,
  endsAt: true,
  location: true,
  host: true,
  registrationUrl: true,
  status: true,
} as const;

export type EventRecord = DigestEvent & {
  createdById: Event["createdById"];
};

export async function getPublishedDigestEvents(
  startsAt: Date,
  endsAt: Date,
  type?: EventType,
): Promise<DigestEvent[]> {
  return getPrisma().event.findMany({
    where: {
      status: "PUBLISHED",
      eventDate: { gte: startsAt, lt: endsAt },
      startsAt: { not: null },
      endsAt: { not: null },
      ...(type ? { type } : {}),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: eventSelect,
  });
}

export async function getStaffDigestEvents(
  eventDateStart: Date,
  eventDateEnd: Date,
): Promise<EventRecord[]> {
  return getPrisma().event.findMany({
    where: { eventDate: { gte: eventDateStart, lt: eventDateEnd } },
    orderBy: [{ eventDate: "asc" }, { startsAt: "asc" }, { id: "asc" }],
    select: { ...eventSelect, createdById: true },
  });
}

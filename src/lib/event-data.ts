import "server-only";

import type {
  EventApprovalStatus,
  EventStatus,
  EventType,
} from "@/generated/prisma/enums";
import type { EventApprovalData } from "@/lib/event-approvals";
import type { DigestEvent } from "@/lib/event-digest";
import { getPrisma } from "@/lib/prisma";

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

const approverSelect = {
  select: { staffProfile: { select: { fullName: true } } },
} as const;

/** У опубликованного события время, место и ведущий известны всегда. */
export type PublishedEvent = DigestEvent & {
  startsAt: Date;
  endsAt: Date;
  location: string;
  host: string;
};

export type EventApprovalRecord = {
  status: EventApprovalStatus;
  note: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
};

export type EventRecord = DigestEvent &
  EventApprovalData & {
    approvals: Record<"SPEAKER" | "ROOM" | "TIME", EventApprovalRecord>;
  };

function isComplete(event: DigestEvent): event is PublishedEvent {
  return Boolean(event.startsAt && event.endsAt && event.location && event.host);
}

export async function getPublishedDigestEvents(
  eventDateStart: Date,
  eventDateEnd: Date,
  type?: EventType,
): Promise<PublishedEvent[]> {
  const events = await getPrisma().event.findMany({
    where: {
      status: "PUBLISHED",
      eventDate: { gte: eventDateStart, lt: eventDateEnd },
      startsAt: { not: null },
      endsAt: { not: null },
      ...(type ? { type } : {}),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: eventSelect,
  });
  return events.filter(isComplete);
}

export async function countPublishedDigestEvents(
  eventDateStart: Date,
  eventDateEnd: Date,
): Promise<number> {
  return getPrisma().event.count({
    where: {
      status: "PUBLISHED",
      eventDate: { gte: eventDateStart, lt: eventDateEnd },
    },
  });
}

export async function getStaffDigestEvents(
  eventDateStart: Date,
  eventDateEnd: Date,
): Promise<EventRecord[]> {
  const events = await getPrisma().event.findMany({
    where: { eventDate: { gte: eventDateStart, lt: eventDateEnd } },
    orderBy: [{ eventDate: "asc" }, { startsAt: "asc" }, { id: "asc" }],
    select: {
      ...eventSelect,
      speakerApproval: true,
      roomApproval: true,
      timeApproval: true,
      speakerApprovalNote: true,
      roomApprovalNote: true,
      timeApprovalNote: true,
      speakerApprovedAt: true,
      roomApprovedAt: true,
      timeApprovedAt: true,
      speakerApprovedBy: approverSelect,
      roomApprovedBy: approverSelect,
      timeApprovedBy: approverSelect,
    },
  });
  return events.map(
    ({
      speakerApprovalNote,
      roomApprovalNote,
      timeApprovalNote,
      speakerApprovedAt,
      roomApprovedAt,
      timeApprovedAt,
      speakerApprovedBy,
      roomApprovedBy,
      timeApprovedBy,
      ...event
    }) => ({
      ...event,
      approvals: {
        SPEAKER: {
          status: event.speakerApproval,
          note: speakerApprovalNote,
          approvedAt: speakerApprovedAt,
          approvedBy: speakerApprovedBy?.staffProfile?.fullName ?? null,
        },
        ROOM: {
          status: event.roomApproval,
          note: roomApprovalNote,
          approvedAt: roomApprovedAt,
          approvedBy: roomApprovedBy?.staffProfile?.fullName ?? null,
        },
        TIME: {
          status: event.timeApproval,
          note: timeApprovalNote,
          approvedAt: timeApprovedAt,
          approvedBy: timeApprovedBy?.staffProfile?.fullName ?? null,
        },
      },
    }),
  );
}

/** Сколько событий в неделях рядом: для переключателя недель. */
export async function getStaffDigestOverview(
  eventDateStart: Date,
  eventDateEnd: Date,
): Promise<{ eventDate: Date; status: EventStatus }[]> {
  return getPrisma().event.findMany({
    where: { eventDate: { gte: eventDateStart, lt: eventDateEnd } },
    select: { eventDate: true, status: true },
  });
}

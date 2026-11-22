"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
import { getMoscowDateKey } from "@/lib/campus-time";
import { getDigestWeek, getDigestWeekKey } from "@/lib/event-digest";
import { parseEventInput, type EventActionState } from "@/lib/event-validation";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function getEventId(formData: FormData): number | null {
  const rawId = formData.get("eventId");
  if (typeof rawId !== "string" || !/^[1-9]\d*$/.test(rawId)) return null;
  const id = Number(rawId);
  return Number.isSafeInteger(id) ? id : null;
}

function getEventFormInput(formData: FormData): Record<string, unknown> {
  return {
    title: formData.get("title"),
    type: formData.get("type"),
    description: formData.get("description"),
    date: formData.get("date"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    host: formData.get("host"),
    registrationUrl: formData.get("registrationUrl"),
    status: formData.get("status"),
  };
}

function revalidateEventPages(): void {
  revalidatePath("/digest");
  revalidatePath("/staff/events");
}

function getEventDate(value: Date): Date {
  return new Date(`${getMoscowDateKey(value)}T00:00:00.000Z`);
}

function hasPublicEventChanges(
  current: {
    title: string;
    type: string;
    description: string | null;
    eventDate: Date;
    startsAt: Date | null;
    endsAt: Date | null;
    location: string | null;
    host: string | null;
    registrationUrl: string | null;
  },
  next: {
    title: string;
    type: string;
    description: string | null;
    eventDate: Date;
    startsAt: Date;
    endsAt: Date;
    location: string;
    host: string;
    registrationUrl: string | null;
  },
): boolean {
  return (
    current.title !== next.title ||
    current.type !== next.type ||
    current.description !== next.description ||
    current.eventDate.getTime() !== next.eventDate.getTime() ||
    current.startsAt?.getTime() !== next.startsAt.getTime() ||
    current.endsAt?.getTime() !== next.endsAt.getTime() ||
    current.location !== next.location ||
    current.host !== next.host ||
    current.registrationUrl !== next.registrationUrl
  );
}

function hasApprovedPublicationData(
  current: {
    speakerApproval: string;
    roomApproval: string;
    timeApproval: string;
    speakerApprovalNote: string | null;
    roomApprovalNote: string | null;
  },
  next: {
    startsAt: Date;
    endsAt: Date;
    location: string;
    host: string;
  },
): boolean {
  const speakerReady =
    current.speakerApproval === "APPROVED" ||
    (current.speakerApproval === "NOT_REQUIRED" &&
      Boolean(current.speakerApprovalNote?.trim()));
  const roomReady =
    current.roomApproval === "APPROVED" ||
    (current.roomApproval === "NOT_REQUIRED" &&
      Boolean(current.roomApprovalNote?.trim()));
  return (
    speakerReady &&
    roomReady &&
    current.timeApproval === "APPROVED" &&
    Boolean(next.startsAt) &&
    Boolean(next.endsAt) &&
    (current.speakerApproval !== "APPROVED" || Boolean(next.host.trim())) &&
    (current.roomApproval !== "APPROVED" || Boolean(next.location.trim()))
  );
}

export async function createEventAction(
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  const validation = parseEventInput(getEventFormInput(formData));
  if (!validation.ok) {
    return { fieldErrors: validation.fieldErrors };
  }
  if (validation.value.status === "PUBLISHED") {
    return {
      error:
        "Нельзя создать опубликованное событие без завершённых согласований.",
    };
  }

  await getPrisma().event.create({
    data: {
      ...validation.value,
      eventDate: getEventDate(validation.value.startsAt),
      speakerApproval: "PENDING",
      roomApproval: "PENDING",
      timeApproval: "PENDING",
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateEventPages();
  return { success: "Событие добавлено." };
}

export async function updateEventAction(
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  const eventId = getEventId(formData);
  if (eventId === null) return { error: "Событие не найдено." };

  const validation = parseEventInput(getEventFormInput(formData));
  if (!validation.ok) {
    return { fieldErrors: validation.fieldErrors };
  }

  const prisma = getPrisma();
  const current = await prisma.event.findUnique({ where: { id: eventId } });
  if (!current) return { error: "Событие не найдено." };
  const next = {
    ...validation.value,
    eventDate: getEventDate(validation.value.startsAt),
  };
  const publicChanges = hasPublicEventChanges(current, next);
  if (validation.value.status === "PUBLISHED") {
    if (publicChanges) {
      return {
        error:
          "Сначала сохраните изменения как черновик и завершите согласования повторно.",
      };
    }
    if (!hasApprovedPublicationData(current, validation.value)) {
      return {
        error:
          "Публикация недоступна: обязательные согласования не завершены.",
      };
    }
  }

  const nextApprovals = publicChanges
    ? {
        speakerApproval: "PENDING" as const,
        roomApproval: "PENDING" as const,
        timeApproval: "PENDING" as const,
      }
    : {};

  const changedApprovals = [
    {
      item: "SPEAKER" as const,
      from: current.speakerApproval,
      to: nextApprovals.speakerApproval ?? current.speakerApproval,
    },
    {
      item: "ROOM" as const,
      from: current.roomApproval,
      to: nextApprovals.roomApproval ?? current.roomApproval,
    },
    {
      item: "TIME" as const,
      from: current.timeApproval,
      to: nextApprovals.timeApproval ?? current.timeApproval,
    },
  ].filter((approval) => approval.from !== approval.to);

  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.event.updateMany({
      where: { id: eventId, updatedAt: current.updatedAt },
      data: { ...next, ...nextApprovals },
    });
    if (result.count !== 1) return false;
    const history = changedApprovals.map((approval) => ({
      eventId,
      action: "APPROVAL_STATUS_CHANGED" as const,
      item: approval.item,
      fromApprovalStatus: approval.from,
      toApprovalStatus: approval.to,
      changedById: userId,
    }));
    if (history.length > 0) {
      await transaction.eventApprovalHistory.createMany({ data: history });
    }
    if (current.status !== validation.value.status) {
      await transaction.eventApprovalHistory.create({
        data: {
          eventId,
          action: "PUBLICATION_CHANGED",
          fromEventStatus: current.status,
          toEventStatus: validation.value.status,
          changedById: userId,
        },
      });
    }
    return true;
  });
  if (!updated) return { error: "Событие изменилось. Обновите страницу." };

  revalidateEventPages();
  return { success: "Изменения сохранены." };
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  await assertSameSiteRequest();
  await requireStaffContext();
  const eventId = getEventId(formData);
  if (eventId === null) notFound();

  const result = await getPrisma().event.deleteMany({
    where: { id: eventId },
  });
  if (result.count !== 1) notFound();
  revalidateEventPages();
}

export async function copyEventToNextWeekAction(
  formData: FormData,
): Promise<void> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  const eventId = getEventId(formData);
  if (eventId === null) notFound();

  const event = await getPrisma().event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      type: true,
      description: true,
      eventDate: true,
      startsAt: true,
      endsAt: true,
      location: true,
      host: true,
      registrationUrl: true,
    },
  });
  if (!event) notFound();

  const eventDate = new Date(event.eventDate);
  eventDate.setUTCDate(eventDate.getUTCDate() + 7);
  const startsAt = event.startsAt
    ? new Date(event.startsAt.getTime() + 7 * DAY_IN_MILLISECONDS)
    : null;
  const endsAt = event.endsAt
    ? new Date(event.endsAt.getTime() + 7 * DAY_IN_MILLISECONDS)
    : null;
  await getPrisma().event.create({
    data: {
      ...event,
      eventDate,
      startsAt,
      endsAt,
      status: "DRAFT",
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateEventPages();
  const nextWeek = getDigestWeek(undefined, eventDate);
  redirect(`/staff/events?week=${getDigestWeekKey(nextWeek)}`);
}

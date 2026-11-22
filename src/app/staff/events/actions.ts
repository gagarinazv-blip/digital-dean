"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
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

  await getPrisma().event.create({
    data: { ...validation.value, createdById: userId },
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
  await requireStaffContext();
  const eventId = getEventId(formData);
  if (eventId === null) return { error: "Событие не найдено." };

  const validation = parseEventInput(getEventFormInput(formData));
  if (!validation.ok) {
    return { fieldErrors: validation.fieldErrors };
  }

  const result = await getPrisma().event.updateMany({
    where: { id: eventId },
    data: validation.value,
  });
  if (result.count !== 1) return { error: "Событие не найдено." };

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
      startsAt: true,
      endsAt: true,
      location: true,
      host: true,
      registrationUrl: true,
    },
  });
  if (!event) notFound();

  const startsAt = new Date(
    event.startsAt.getTime() + 7 * DAY_IN_MILLISECONDS,
  );
  const endsAt = new Date(event.endsAt.getTime() + 7 * DAY_IN_MILLISECONDS);
  await getPrisma().event.create({
    data: {
      ...event,
      startsAt,
      endsAt,
      status: "DRAFT",
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateEventPages();
  const nextWeek = getDigestWeek(undefined, startsAt);
  redirect(`/staff/events?week=${getDigestWeekKey(nextWeek)}`);
}

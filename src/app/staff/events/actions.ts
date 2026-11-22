"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type {
  EventApprovalItem,
  EventApprovalStatus,
} from "@/generated/prisma/enums";
import { assertSameSiteRequest } from "@/lib/auth";
import {
  approvalItemLabels,
  approvalItems,
  getApprovalStatus,
  getPublicationBlockers,
  getStatusAfterChange,
  hasApprovalValue,
  isApprovalItem,
  isSelectableApprovalStatus,
  type EventApprovalData,
} from "@/lib/event-approvals";
import { getDigestWeek, getDigestWeekKey, isDateKey, shiftDigestWeek } from "@/lib/event-digest";
import {
  parseEventInput,
  type EventActionState,
  type EventInput,
} from "@/lib/event-validation";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const NOTE_LIMIT = 200;

export type EventCommandResult =
  | { ok: true; message: string; weekKey?: string }
  | { ok: false; error: string };

const changedMessage = "Событие уже изменили. Обновите страницу.";
const notFoundMessage = "Событие не найдено.";

const approvalFields = {
  SPEAKER: {
    status: "speakerApproval",
    note: "speakerApprovalNote",
    approvedAt: "speakerApprovedAt",
    approvedById: "speakerApprovedById",
  },
  ROOM: {
    status: "roomApproval",
    note: "roomApprovalNote",
    approvedAt: "roomApprovedAt",
    approvedById: "roomApprovedById",
  },
  TIME: {
    status: "timeApproval",
    note: "timeApprovalNote",
    approvedAt: "timeApprovedAt",
    approvedById: "timeApprovedById",
  },
} as const;

function isEventId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

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

function getSubmittedStatus(
  formData: FormData,
  item: EventApprovalItem,
  fallback: EventApprovalStatus,
): EventApprovalStatus {
  const value = formData.get(`approval${item}`);
  return isSelectableApprovalStatus(value) ? value : fallback;
}

function getSubmittedNote(
  formData: FormData,
  item: EventApprovalItem,
  fallback: string | null,
): string | null {
  const value = formData.get(`note${item}`);
  return typeof value === "string"
    ? value.trim().slice(0, NOTE_LIMIT) || null
    : fallback;
}

function getApprovalUpdate(
  item: EventApprovalItem,
  from: EventApprovalStatus,
  to: EventApprovalStatus,
  userId: number,
): Prisma.EventUncheckedUpdateManyInput {
  if (from === to) return {};
  const fields = approvalFields[item];
  return {
    [fields.status]: to,
    [fields.approvedAt]: to === "APPROVED" ? new Date() : null,
    [fields.approvedById]: to === "APPROVED" ? userId : null,
  };
}

function isItemChanged(
  item: EventApprovalItem,
  current: Pick<EventApprovalData, "startsAt" | "endsAt" | "location" | "host"> & {
    eventDate: Date;
  },
  next: EventInput,
): boolean {
  if (item === "SPEAKER") return current.host !== next.host;
  if (item === "ROOM") return current.location !== next.location;
  return (
    current.eventDate.getTime() !== next.eventDate.getTime() ||
    current.startsAt?.getTime() !== next.startsAt?.getTime() ||
    current.endsAt?.getTime() !== next.endsAt?.getTime()
  );
}

function getApprovalValueError(
  data: Pick<EventApprovalData, "startsAt" | "endsAt" | "location" | "host">,
  statuses: Record<EventApprovalItem, EventApprovalStatus>,
): string | null {
  const item = approvalItems.find(
    (candidate) =>
      statuses[candidate] === "APPROVED" && !hasApprovalValue(data, candidate),
  );
  return item
    ? `Нельзя отметить согласованным пустое поле «${approvalItemLabels[item]}».`
    : null;
}

function revalidateEventPages(): void {
  revalidatePath("/digest");
  revalidatePath("/staff/events");
}

// Новое событие всегда черновик: студенты увидят его только после публикации.
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

  const statuses = {
    SPEAKER: getSubmittedStatus(formData, "SPEAKER", "NOT_APPROVED"),
    ROOM: getSubmittedStatus(formData, "ROOM", "NOT_APPROVED"),
    TIME: getSubmittedStatus(formData, "TIME", "NOT_APPROVED"),
  };
  const valueError = getApprovalValueError(validation.value, statuses);
  if (valueError) return { error: valueError };

  const now = new Date();
  await getPrisma().$transaction(async (transaction) => {
    const event = await transaction.event.create({
      data: {
        ...validation.value,
        speakerApproval: statuses.SPEAKER,
        roomApproval: statuses.ROOM,
        timeApproval: statuses.TIME,
        speakerApprovalNote: getSubmittedNote(formData, "SPEAKER", null),
        roomApprovalNote: getSubmittedNote(formData, "ROOM", null),
        timeApprovalNote: getSubmittedNote(formData, "TIME", null),
        ...(statuses.SPEAKER === "APPROVED"
          ? { speakerApprovedAt: now, speakerApprovedById: userId }
          : {}),
        ...(statuses.ROOM === "APPROVED"
          ? { roomApprovedAt: now, roomApprovedById: userId }
          : {}),
        ...(statuses.TIME === "APPROVED"
          ? { timeApprovedAt: now, timeApprovedById: userId }
          : {}),
        createdById: userId,
      },
      select: { id: true },
    });
    await transaction.eventApprovalHistory.createMany({
      data: approvalItems.map((item) => ({
        eventId: event.id,
        action: "APPROVAL_STATUS_CHANGED" as const,
        item,
        toApprovalStatus: statuses[item],
        changedById: userId,
      })),
    });
  });
  revalidateEventPages();
  return { success: "Черновик добавлен. Студенты его пока не видят." };
}

export async function updateEventAction(
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  const eventId = getEventId(formData);
  if (eventId === null) return { error: notFoundMessage };

  const validation = parseEventInput(getEventFormInput(formData));
  if (!validation.ok) {
    return { fieldErrors: validation.fieldErrors };
  }

  const prisma = getPrisma();
  const current = await prisma.event.findUnique({ where: { id: eventId } });
  if (!current) return { error: notFoundMessage };

  const next = validation.value;
  const changes = approvalItems.map((item) => {
    const from = getApprovalStatus(current, item);
    const isChanged = isItemChanged(item, current, next);
    return {
      item,
      from,
      isChanged,
      to: getStatusAfterChange(
        from,
        getSubmittedStatus(formData, item, from),
        isChanged,
      ),
    };
  });
  const statuses = Object.fromEntries(
    changes.map(({ item, to }) => [item, to]),
  ) as Record<EventApprovalItem, EventApprovalStatus>;
  const valueError = getApprovalValueError(next, statuses);
  if (valueError) return { error: valueError };

  const blockers = getPublicationBlockers({
    ...next,
    speakerApproval: statuses.SPEAKER,
    roomApproval: statuses.ROOM,
    timeApproval: statuses.TIME,
  });
  // Правка опубликованного события прячет его от студентов до нового согласования.
  const isWithdrawn =
    current.status === "PUBLISHED" &&
    next.status === "PUBLISHED" &&
    blockers.length > 0;
  if (next.status === "PUBLISHED" && blockers.length > 0 && !isWithdrawn) {
    return {
      error: `Публикация недоступна: обязательные согласования не завершены (${blockers.join(", ")}).`,
    };
  }
  const status = isWithdrawn ? ("DRAFT" as const) : next.status;

  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.event.updateMany({
      where: { id: eventId, updatedAt: current.updatedAt },
      data: {
        ...next,
        status,
        ...Object.assign(
          {},
          ...changes.map(({ item, from, to }) =>
            getApprovalUpdate(item, from, to, userId),
          ),
        ),
        speakerApprovalNote: getSubmittedNote(
          formData,
          "SPEAKER",
          current.speakerApprovalNote,
        ),
        roomApprovalNote: getSubmittedNote(
          formData,
          "ROOM",
          current.roomApprovalNote,
        ),
        timeApprovalNote: getSubmittedNote(
          formData,
          "TIME",
          current.timeApprovalNote,
        ),
      },
    });
    if (result.count !== 1) return false;
    const history: Prisma.EventApprovalHistoryCreateManyInput[] = changes
      .filter(({ from, to }) => from !== to)
      .map(({ item, from, to }) => ({
        eventId,
        action: "APPROVAL_STATUS_CHANGED",
        item,
        fromApprovalStatus: from,
        toApprovalStatus: to,
        changedById: userId,
      }));
    if (current.status !== status) {
      history.push({
        eventId,
        action: "PUBLICATION_CHANGED",
        fromEventStatus: current.status,
        toEventStatus: status,
        changedById: userId,
      });
    }
    if (history.length > 0) {
      await transaction.eventApprovalHistory.createMany({ data: history });
    }
    return true;
  });
  if (!updated) return { error: changedMessage };

  revalidateEventPages();
  return {
    success: isWithdrawn
      ? "Изменения сохранены. Событие вернулось в черновики до нового согласования."
      : "Изменения сохранены.",
  };
}

export async function setEventApprovalAction(
  eventId: number,
  item: EventApprovalItem,
  status: EventApprovalStatus,
): Promise<EventCommandResult> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  if (
    !isEventId(eventId) ||
    !isApprovalItem(item) ||
    !isSelectableApprovalStatus(status)
  ) {
    return { ok: false, error: "Не удалось изменить статус." };
  }

  const prisma = getPrisma();
  const current = await prisma.event.findUnique({ where: { id: eventId } });
  if (!current) return { ok: false, error: notFoundMessage };
  const from = getApprovalStatus(current, item);
  if (from === status) return { ok: true, message: "Статус не изменился." };
  if (status === "APPROVED" && !hasApprovalValue(current, item)) {
    return {
      ok: false,
      error: `Сначала заполните поле «${approvalItemLabels[item]}».`,
    };
  }

  const isWithdrawn = current.status === "PUBLISHED" && status !== "APPROVED";
  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.event.updateMany({
      where: { id: eventId, updatedAt: current.updatedAt },
      data: {
        ...getApprovalUpdate(item, from, status, userId),
        ...(isWithdrawn ? { status: "DRAFT" } : {}),
      },
    });
    if (result.count !== 1) return false;
    await transaction.eventApprovalHistory.createMany({
      data: [
        {
          eventId,
          action: "APPROVAL_STATUS_CHANGED",
          item,
          fromApprovalStatus: from,
          toApprovalStatus: status,
          changedById: userId,
        },
        ...(isWithdrawn
          ? [
              {
                eventId,
                action: "PUBLICATION_CHANGED" as const,
                fromEventStatus: "PUBLISHED" as const,
                toEventStatus: "DRAFT" as const,
                changedById: userId,
              },
            ]
          : []),
      ],
    });
    return true;
  });
  if (!updated) return { ok: false, error: changedMessage };
  revalidateEventPages();
  return {
    ok: true,
    message: isWithdrawn
      ? "Статус изменён. Событие вернулось в черновики."
      : "Статус изменён.",
  };
}

export async function setEventPublicationAction(
  eventId: number,
  isPublished: boolean,
): Promise<EventCommandResult> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  if (!isEventId(eventId)) return { ok: false, error: notFoundMessage };

  const prisma = getPrisma();
  const current = await prisma.event.findUnique({ where: { id: eventId } });
  if (!current) return { ok: false, error: notFoundMessage };
  const status = isPublished === true ? "PUBLISHED" : "DRAFT";
  if (current.status === status) return { ok: true, message: "Уже готово." };
  const blockers = getPublicationBlockers(current);
  if (status === "PUBLISHED" && blockers.length > 0) {
    return { ok: false, error: `Пока нельзя опубликовать: ${blockers.join(", ")}.` };
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.event.updateMany({
      where: { id: eventId, updatedAt: current.updatedAt },
      data: { status },
    });
    if (result.count !== 1) return false;
    await transaction.eventApprovalHistory.create({
      data: {
        eventId,
        action: "PUBLICATION_CHANGED",
        fromEventStatus: current.status,
        toEventStatus: status,
        changedById: userId,
      },
    });
    return true;
  });
  if (!updated) return { ok: false, error: changedMessage };
  revalidateEventPages();
  return {
    ok: true,
    message:
      status === "PUBLISHED"
        ? "Опубликовано: событие видно студентам."
        : "Событие скрыто от студентов.",
  };
}

/** Публикует все согласованные черновики недели, остальные не трогает. */
export async function publishReadyEventsAction(
  weekKey: string,
): Promise<EventCommandResult> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  if (!isDateKey(weekKey)) return { ok: false, error: "Неделя не найдена." };
  const week = getDigestWeek(weekKey);
  if (getDigestWeekKey(week) !== weekKey) {
    return { ok: false, error: "Неделя не найдена." };
  }

  const published = await getPrisma().$transaction(async (transaction) => {
    const drafts = await transaction.event.findMany({
      where: {
        status: "DRAFT",
        eventDate: { gte: week.startDate, lt: shiftDigestWeek(week, 1).startDate },
      },
    });
    let count = 0;
    for (const draft of drafts) {
      if (getPublicationBlockers(draft).length > 0) continue;
      const result = await transaction.event.updateMany({
        where: { id: draft.id, status: "DRAFT", updatedAt: draft.updatedAt },
        data: { status: "PUBLISHED" },
      });
      if (result.count !== 1) continue;
      await transaction.eventApprovalHistory.create({
        data: {
          eventId: draft.id,
          action: "PUBLICATION_CHANGED",
          fromEventStatus: "DRAFT",
          toEventStatus: "PUBLISHED",
          changedById: userId,
        },
      });
      count += 1;
    }
    return count;
  });
  if (published === 0) {
    return { ok: false, error: "Согласованных черновиков на этой неделе нет." };
  }
  revalidateEventPages();
  return { ok: true, message: `Опубликовано событий: ${published}.` };
}

export async function deleteEventAction(
  eventId: number,
): Promise<EventCommandResult> {
  await assertSameSiteRequest();
  await requireStaffContext();
  if (!isEventId(eventId)) return { ok: false, error: notFoundMessage };

  const result = await getPrisma().event.deleteMany({ where: { id: eventId } });
  if (result.count !== 1) return { ok: false, error: notFoundMessage };
  revalidateEventPages();
  return { ok: true, message: "Событие удалено." };
}

export async function copyEventToNextWeekAction(
  eventId: number,
): Promise<EventCommandResult> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  if (!isEventId(eventId)) return { ok: false, error: notFoundMessage };

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
  if (!event) return { ok: false, error: notFoundMessage };

  const shift = (date: Date | null) =>
    date ? new Date(date.getTime() + 7 * DAY_IN_MILLISECONDS) : null;
  const eventDate = new Date(event.eventDate.getTime() + 7 * DAY_IN_MILLISECONDS);
  await getPrisma().event.create({
    data: {
      ...event,
      eventDate,
      startsAt: shift(event.startsAt),
      endsAt: shift(event.endsAt),
      status: "DRAFT",
      // На новую дату всё согласуется заново.
      speakerApproval: "NOT_APPROVED",
      roomApproval: "NOT_APPROVED",
      timeApproval: "NOT_APPROVED",
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateEventPages();
  return {
    ok: true,
    message: "Черновик создан на следующей неделе.",
    weekKey: getDigestWeekKey(
      getDigestWeek(undefined, new Date(eventDate.getTime() + DAY_IN_MILLISECONDS / 2)),
    ),
  };
}

import "server-only";

import type { NotificationType } from "@/generated/prisma/enums";
import type {
  NotificationDetails,
  StudentNotificationItem,
} from "@/lib/notification-types";
import {
  cleanStudentFacingText,
  requestStatusLabels,
  requestTypeLabels,
} from "@/lib/campus-labels";
import { getDemoNow } from "@/lib/demo-date";
import {
  formatMoscowTime,
  formatMoscowWeekdayDate,
  getMoscowDateKey,
} from "@/lib/campus-time";
import { getPrisma } from "@/lib/prisma";
import {
  buildNotificationTargetHref,
  notificationTypeLabels,
} from "@/lib/notification-workflow";

type RawNotification = {
  publicId: string;
  type: NotificationType | null;
  title: string;
  text: string;
  targetType: "SCHEDULE_ITEM" | "DEADLINE" | "REQUEST" | null;
  targetId: string | null;
  createdAt: Date;
  readAt: Date | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

export async function presentStudentNotifications(
  rows: RawNotification[],
  studentId: number,
  groupId: number,
): Promise<StudentNotificationItem[]> {
  const prisma = getPrisma();
  const scheduleIds = [...new Set(
    rows.flatMap((row) =>
      row.targetType === "SCHEDULE_ITEM" && row.targetId && /^\d+$/.test(row.targetId)
        ? [Number(row.targetId)]
        : [],
    ),
  )];
  const requestIds = [...new Set(
    rows.flatMap((row) =>
      row.targetType === "REQUEST" && row.targetId ? [row.targetId] : [],
    ),
  )];
  const deadlineIds = [...new Set(
    rows.flatMap((row) =>
      row.targetType === "DEADLINE" && row.targetId ? [row.targetId] : [],
    ),
  )];
  const [scheduleItems, requests, deadlines] = await Promise.all([
    scheduleIds.length
      ? prisma.scheduleItem.findMany({
          where: { id: { in: scheduleIds }, groupId },
          select: {
            id: true,
            date: true,
            startsAt: true,
            endsAt: true,
            originalStartsAt: true,
            originalEndsAt: true,
            originalRoom: true,
            room: true,
            changeNote: true,
            subject: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    requestIds.length
      ? prisma.request.findMany({
          where: { publicId: { in: requestIds }, studentId },
          select: { publicId: true, status: true, type: true },
        })
      : Promise.resolve([]),
    deadlineIds.length
      ? prisma.deadline.findMany({
          where: { id: { in: deadlineIds }, studentId },
          select: { id: true, subject: true, title: true, dueAt: true, status: true },
        })
      : Promise.resolve([]),
  ]);

  const scheduleById = new Map(scheduleItems.map((item) => [String(item.id), item]));
  const requestById = new Map(requests.map((item) => [item.publicId, item]));
  const deadlineById = new Map(deadlines.map((item) => [item.id, item]));
  const now = getDemoNow();

  return rows.flatMap((row) => {
    if (!row.type) return [];
    let targetAvailable: boolean | null = null;
    let href = buildNotificationTargetHref(
      row.type,
      row.targetType,
      row.targetId,
    );
    let source = notificationTypeLabels[row.type];
    let context = dateTimeFormatter.format(row.createdAt);
    const details: NotificationDetails = {};
    if (
      row.type === "SCHEDULE_CHANGE" ||
      row.type === "REQUEST_STATUS" ||
      row.type === "DEADLINE"
    ) {
      targetAvailable = false;
    }

    if (row.type === "SCHEDULE_CHANGE" && row.targetId) {
      const item = scheduleById.get(row.targetId);
      targetAvailable = Boolean(item);
      if (item) {
        const startsAt = item.startsAt;
        const endsAt = item.endsAt;
        const originalStartsAt = item.originalStartsAt;
        const originalEndsAt = item.originalEndsAt;
        const dateLabel = startsAt
          ? formatMoscowWeekdayDate(startsAt)
          : item.date
            ? formatMoscowWeekdayDate(item.date)
            : "Дата уточняется";
        const dateKey = startsAt
          ? getMoscowDateKey(startsAt)
          : item.date?.toISOString().slice(0, 10);
        href = dateKey
          ? `/schedule?view=week&date=${dateKey}&day=${dateKey}&lesson=${item.id}`
          : null;
        const timeLabel =
          startsAt && endsAt
            ? `${formatMoscowTime(startsAt)}–${formatMoscowTime(endsAt)}`
            : "Время уточняется";
        details.schedule = {
          dateLabel,
          timeLabel,
          previousTimeLabel:
            originalStartsAt && originalEndsAt
              ? `${formatMoscowTime(originalStartsAt)}–${formatMoscowTime(originalEndsAt)}`
              : null,
          previousDateLabel:
            originalStartsAt &&
            formatMoscowWeekdayDate(originalStartsAt) !== dateLabel
              ? formatMoscowWeekdayDate(originalStartsAt)
              : null,
          previousRoom: item.originalRoom,
          room: item.room,
          changeNote: item.changeNote,
        };
        source = cleanStudentFacingText(item.subject.name);
        context = `${source} · ${dateLabel} · открыть расписание`;
      }
    } else if (row.type === "REQUEST_STATUS" && row.targetId) {
      const request = requestById.get(row.targetId);
      targetAvailable = Boolean(request);
      if (request) {
        details.request = {
          statusLabel: requestStatusLabels[request.status],
          serviceLabel: requestTypeLabels[request.type],
        };
        source = `Заявка · ${details.request.serviceLabel}`;
        context = `${details.request.serviceLabel} · ${details.request.statusLabel} · открыть обращение`;
      }
    } else if (row.type === "DEADLINE" && row.targetId) {
      const deadline = deadlineById.get(row.targetId);
      targetAvailable = Boolean(deadline);
      if (deadline) {
        const remainingDays = Math.ceil(
          (deadline.dueAt.getTime() - now.getTime()) / 86_400_000,
        );
        details.deadline = {
          subject: cleanStudentFacingText(deadline.subject),
          dueAt: deadline.dueAt.toISOString(),
          statusLabel: deadline.status === "SUBMITTED" ? "Сдано" : "Открыто",
          remainingLabel:
            deadline.status === "SUBMITTED"
              ? null
              : remainingDays < 0
                ? `Просрочено на ${Math.abs(remainingDays)} дн.`
                : `Осталось ${remainingDays} дн.`,
        };
        source = cleanStudentFacingText(deadline.subject);
        context = `${source} · ${dateTimeFormatter.format(deadline.dueAt)} · открыть задание`;
      }
    }
    if (targetAvailable === false) href = null;

    return [{
      publicId: row.publicId,
      type: row.type,
      title: cleanStudentFacingText(row.title),
      text: cleanStudentFacingText(row.text),
      targetType: row.targetType,
      targetId: row.targetId,
      href,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      source,
      context,
      targetAvailable,
      details,
    }];
  });
}

import "server-only";

import type {
  NotificationTargetType,
  NotificationType,
} from "@/generated/prisma/enums";
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
import { getSafeExternalUrl } from "@/lib/deadline-action";
import {
  getDeadlineCountdown,
  getDeadlineRemaining,
} from "@/lib/deadline-utils";
import {
  formatMoscowDateTime,
  formatMoscowTime,
  formatMoscowWeekdayDate,
  getMoscowDateTime,
  getMoscowDateKey,
} from "@/lib/campus-time";
import { getPrisma } from "@/lib/prisma";
import { formatRequestNumber } from "@/lib/request-number";
import {
  buildNotificationTargetHref,
  notificationTypeLabels,
} from "@/lib/notification-workflow";

type RawNotification = {
  publicId: string;
  type: NotificationType | null;
  title: string;
  text: string;
  targetType: NotificationTargetType | null;
  targetId: string | null;
  createdAt: Date;
  readAt: Date | null;
};

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
  const academicSessionIds = [...new Set(
    rows.flatMap((row) =>
      row.targetType === "ACADEMIC_SESSION" && row.targetId && /^\d+$/.test(row.targetId)
        ? [Number(row.targetId)]
        : [],
    ),
  )];
  const [scheduleItems, requests, deadlines, academicSessions] = await Promise.all([
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
          select: { id: true, publicId: true, status: true, type: true },
        })
      : Promise.resolve([]),
    deadlineIds.length
      ? prisma.deadline.findMany({
          where: { id: { in: deadlineIds }, studentId },
          select: {
            id: true,
            subject: true,
            title: true,
            topic: true,
            format: true,
            taskUrl: true,
            location: true,
            dueAt: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    academicSessionIds.length
      ? prisma.academicSessionItem.findMany({
          where: {
            id: { in: academicSessionIds },
            planItem: { semester: { studentId } },
          },
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            room: true,
            planItem: {
              select: {
                name: true,
                semester: { select: { code: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const scheduleById = new Map(scheduleItems.map((item) => [String(item.id), item]));
  const requestById = new Map(requests.map((item) => [item.publicId, item]));
  const deadlineById = new Map(deadlines.map((item) => [item.id, item]));
  const academicSessionById = new Map(
    academicSessions.map((item) => [String(item.id), item]),
  );
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
    let context = source;
    const details: NotificationDetails = {};
    if (
      row.type === "SCHEDULE_CHANGE" ||
      row.type === "REQUEST_STATUS" ||
      row.type === "DEADLINE"
    ) {
      targetAvailable = false;
    }

    if (
      row.type === "SCHEDULE_CHANGE" &&
      row.targetType === "ACADEMIC_SESSION" &&
      row.targetId
    ) {
      const item = academicSessionById.get(row.targetId);
      targetAvailable = Boolean(item);
      if (item) {
        const startsAt = getMoscowDateTime(item.date, item.startTime);
        const endsAt = getMoscowDateTime(item.date, item.endTime);
        const dateLabel = formatMoscowWeekdayDate(startsAt);
        const timeLabel = `${formatMoscowTime(startsAt)}–${formatMoscowTime(endsAt)}`;
        href = `/schedule?section=session&semester=${encodeURIComponent(item.planItem.semester.code)}&event=${item.id}`;
        details.schedule = {
          dateLabel,
          timeLabel,
          previousTimeLabel: null,
          previousDateLabel: null,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          previousStartsAt: null,
          previousEndsAt: null,
          previousRoom: null,
          room: item.room,
          changeNote: null,
        };
        source = cleanStudentFacingText(item.planItem.name);
        context = `${source} · открыть сессию`;
      }
    } else if (
      row.type === "SCHEDULE_CHANGE" &&
      row.targetType === "SCHEDULE_ITEM" &&
      row.targetId
    ) {
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
          startsAt: startsAt?.toISOString() ?? null,
          endsAt: endsAt?.toISOString() ?? null,
          previousStartsAt: originalStartsAt?.toISOString() ?? null,
          previousEndsAt: originalEndsAt?.toISOString() ?? null,
          previousRoom: item.originalRoom,
          room: item.room,
          changeNote: item.changeNote,
        };
        source = cleanStudentFacingText(item.subject.name);
        context = `${source} · открыть расписание`;
      }
    } else if (row.type === "REQUEST_STATUS" && row.targetId) {
      const request = requestById.get(row.targetId);
      targetAvailable = Boolean(request);
      if (request) {
        details.request = {
          requestNumber: formatRequestNumber(request.id),
          statusLabel: requestStatusLabels[request.status],
          serviceLabel: requestTypeLabels[request.type],
        };
        source = `Заявка · ${details.request.serviceLabel}`;
        context = `${details.request.requestNumber} · ${details.request.serviceLabel} · ${details.request.statusLabel} · открыть обращение`;
      }
    } else if (row.type === "DEADLINE" && row.targetId) {
      const deadline = deadlineById.get(row.targetId);
      targetAvailable = Boolean(deadline);
      if (deadline) {
        const countdown = getDeadlineCountdown(deadline.dueAt, now);
        details.deadline = {
          id: deadline.id,
          title: cleanStudentFacingText(deadline.title),
          subject: cleanStudentFacingText(deadline.subject),
          topic: deadline.topic,
          format: deadline.format,
          taskUrl: getSafeExternalUrl(deadline.taskUrl),
          location: deadline.location,
          dueAt: deadline.dueAt.toISOString(),
          dueLabel: formatMoscowDateTime(deadline.dueAt),
          statusLabel: deadline.status === "SUBMITTED" ? "Сдано" : "Открыто",
          remainingLabel:
            deadline.status === "SUBMITTED"
              ? null
              : countdown.label,
          remaining:
            deadline.status === "SUBMITTED"
              ? null
              : getDeadlineRemaining(deadline.dueAt, now, deadline.format),
        };
        source = cleanStudentFacingText(deadline.subject);
        context = `${source} · открыть задание`;
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

import "server-only";

import type { NotificationType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

const activityNotificationWhere = {
  type: { not: null },
} as const;

export const activityNotificationSelection = {
  publicId: true,
  type: true,
  title: true,
  text: true,
  targetType: true,
  targetId: true,
  createdAt: true,
  readAt: true,
} as const;

export type NotificationCursor = {
  publicId: string;
};

export async function getStudentNotifications(studentId: number) {
  return getPrisma().notification.findMany({
    where: { ...activityNotificationWhere, studentId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: activityNotificationSelection,
  });
}

export async function getStudentNotificationPage(
  studentId: number,
  limit: number,
  cursor?: NotificationCursor,
) {
  const prisma = getPrisma();
  const where = { ...activityNotificationWhere, studentId };
  const [notifications, unreadCount, groupedTypes] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor
        ? { cursor: { publicId: cursor.publicId }, skip: 1 }
        : {}),
      take: limit + 1,
      select: activityNotificationSelection,
    }),
    prisma.notification.count({
      where: { ...where, readAt: null },
    }),
    prisma.notification.groupBy({
      by: ["type"],
      where,
      _count: { _all: true },
    }),
  ]);
  const typeCounts: Partial<Record<NotificationType, number>> = {};
  for (const row of groupedTypes) {
    if (row.type) typeCounts[row.type] = row._count._all;
  }
  const hasMore = notifications.length > limit;
  const page = hasMore ? notifications.slice(0, limit) : notifications;
  return {
    notifications: page,
    unreadCount,
    typeCounts,
    hasMore,
    nextCursor: hasMore ? page.at(-1)?.publicId ?? null : null,
  };
}

export async function studentOwnsNotificationCursor(
  publicId: string,
  studentId: number,
) {
  return Boolean(
    await getPrisma().notification.findFirst({
      where: { ...activityNotificationWhere, publicId, studentId },
      select: { publicId: true },
    }),
  );
}

export async function getStudentNotification(
  publicId: string,
  studentId: number,
) {
  return getPrisma().notification.findFirst({
    where: { ...activityNotificationWhere, publicId, studentId },
    select: activityNotificationSelection,
  });
}

export async function getStudentNotificationsByPublicIds(
  publicIds: string[],
  studentId: number,
) {
  return getPrisma().notification.findMany({
    where: {
      ...activityNotificationWhere,
      publicId: { in: publicIds },
      studentId,
    },
    select: { publicId: true },
  });
}

export async function countUnreadStudentNotifications(studentId: number) {
  return getPrisma().notification.count({
    where: { ...activityNotificationWhere, studentId, readAt: null },
  });
}

export async function markStudentNotificationRead(
  publicId: string,
  studentId: number,
  readAt = new Date(),
) {
  return getPrisma().notification.updateMany({
    where: { ...activityNotificationWhere, publicId, studentId, readAt: null },
    data: { readAt, isRead: true },
  });
}

export async function markStudentNotificationReadState(
  publicId: string,
  studentId: number,
  read: boolean,
  readAt = new Date(),
) {
  return getPrisma().notification.updateMany({
    where: {
      ...activityNotificationWhere,
      publicId,
      studentId,
      ...(read ? { readAt: null } : { readAt: { not: null } }),
    },
    data: { readAt: read ? readAt : null, isRead: read },
  });
}

export async function markStudentNotificationsReadState(
  publicIds: string[],
  studentId: number,
  read: boolean,
  readAt = new Date(),
) {
  return getPrisma().notification.updateMany({
    where: {
      ...activityNotificationWhere,
      publicId: { in: publicIds },
      studentId,
      ...(read ? { readAt: null } : { readAt: { not: null } }),
    },
    data: { readAt: read ? readAt : null, isRead: read },
  });
}

export async function markAllStudentNotificationsRead(
  studentId: number,
  readAt = new Date(),
) {
  return getPrisma().notification.updateMany({
    where: { ...activityNotificationWhere, studentId, readAt: null },
    data: { readAt, isRead: true },
  });
}

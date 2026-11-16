import "server-only";

import { getPrisma } from "@/lib/prisma";

const activityNotificationWhere = {
  type: { not: null },
} as const;

const activityNotificationSelection = {
  publicId: true,
  type: true,
  title: true,
  text: true,
  targetType: true,
  targetId: true,
  createdAt: true,
  readAt: true,
} as const;

export async function getStudentNotifications(studentId: number) {
  return getPrisma().notification.findMany({
    where: { ...activityNotificationWhere, studentId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: activityNotificationSelection,
  });
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

export async function markAllStudentNotificationsRead(
  studentId: number,
  readAt = new Date(),
) {
  return getPrisma().notification.updateMany({
    where: { ...activityNotificationWhere, studentId, readAt: null },
    data: { readAt, isRead: true },
  });
}

import "server-only";

import { notFound, redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import {
  buildNotificationTargetHref,
  isNotificationPublicId,
} from "@/lib/notification-workflow";
import {
  getStudentNotification,
  markStudentNotificationRead,
} from "@/lib/notification-data";
import { requireStudentContext } from "@/lib/student";

export const instant = false;

export default async function OpenNotificationPage({
  params,
}: {
  params: Promise<{ notificationId: string }>;
}) {
  const [{ notificationId }, { student }] = await Promise.all([
    params,
    requireStudentContext(),
  ]);
  if (!isNotificationPublicId(notificationId)) notFound();

  const notification = await getStudentNotification(
    notificationId,
    student.id,
  );
  if (
    !notification?.type ||
    !notification.targetType ||
    !notification.targetId
  ) {
    notFound();
  }

  const destination = buildNotificationTargetHref(
    notification.type,
    notification.targetType,
    notification.targetId,
  );
  if (!destination) notFound();

  const targetIsAvailable = await isTargetAvailable(
    notification.targetType,
    notification.targetId,
    student.id,
    student.group.id,
  );
  if (!targetIsAvailable) notFound();

  await markStudentNotificationRead(notification.publicId, student.id);
  redirect(destination);
}

async function isTargetAvailable(
  targetType: "SCHEDULE_ITEM" | "DEADLINE" | "REQUEST",
  targetId: string,
  studentId: number,
  groupId: number,
): Promise<boolean> {
  const prisma = getPrisma();
  if (targetType === "SCHEDULE_ITEM") {
    const scheduleItemId = Number(targetId);
    if (!Number.isSafeInteger(scheduleItemId) || scheduleItemId <= 0) {
      return false;
    }
    return Boolean(
      await prisma.scheduleItem.findFirst({
        where: { id: scheduleItemId, groupId },
        select: { id: true },
      }),
    );
  }
  if (targetType === "DEADLINE") {
    return Boolean(
      await prisma.deadline.findFirst({
        where: { id: targetId, studentId },
        select: { id: true },
      }),
    );
  }
  return Boolean(
    await prisma.request.findFirst({
      where: { publicId: targetId, studentId },
      select: { publicId: true },
    }),
  );
}

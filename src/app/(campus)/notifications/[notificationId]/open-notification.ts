import "server-only";

import { notFound, redirect } from "next/navigation";
import { isNotificationPublicId } from "@/lib/notification-workflow";
import {
  getStudentNotification,
  markStudentNotificationRead,
} from "@/lib/notification-data";
import { presentStudentNotifications } from "@/lib/notification-presentation";
import { requireStudentContext } from "@/lib/student";

type OpenNotificationProps = {
  params: Promise<{ notificationId: string }>;
};

export async function openNotification({
  params,
}: OpenNotificationProps): Promise<never> {
  const [{ notificationId }, { student }] = await Promise.all([
    params,
    requireStudentContext(),
  ]);
  if (!isNotificationPublicId(notificationId)) notFound();

  const notification = await getStudentNotification(
    notificationId,
    student.id,
  );
  if (!notification?.type) notFound();
  const [presented] = await presentStudentNotifications(
    [notification],
    student.id,
    student.group.id,
  );
  if (!presented) notFound();

  await markStudentNotificationRead(notification.publicId, student.id);
  return redirect(
    presented.targetAvailable === false || !presented.href
      ? `/notifications?open=${encodeURIComponent(notification.publicId)}`
      : presented.href,
  );
}

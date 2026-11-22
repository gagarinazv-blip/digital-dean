import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { StaffNotificationType } from "@/generated/prisma/enums";

type StaffNotificationPayload = {
  eventKey: string;
  type: StaffNotificationType;
  title: string;
  body: string;
  link: string;
  relatedStudentId?: number;
};

export async function notifyStaff(
  tx: Prisma.TransactionClient,
  payload: StaffNotificationPayload,
): Promise<void> {
  const recipients = await tx.user.findMany({
    where: { role: "STAFF" },
    select: { id: true },
  });
  if (recipients.length === 0) return;

  await tx.staffNotification.createMany({
    data: recipients.map(({ id }) => ({
      recipientId: id,
      eventKey: payload.eventKey,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      relatedStudentId: payload.relatedStudentId ?? null,
    })),
    skipDuplicates: true,
  });
}

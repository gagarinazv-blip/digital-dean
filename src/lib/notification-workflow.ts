import type {
  NotificationTargetType,
  NotificationType,
} from "@/generated/prisma/enums";

const notificationTypes: NotificationType[] = [
  "SCHEDULE_CHANGE",
  "DEADLINE",
  "REQUEST_STATUS",
  "ANNOUNCEMENT",
];

export const notificationTypeLabels: Record<NotificationType, string> = {
  SCHEDULE_CHANGE: "Перенос занятия",
  DEADLINE: "Дедлайн",
  REQUEST_STATUS: "Изменение статуса заявки",
  ANNOUNCEMENT: "Объявление",
};

const targetByType: Record<
  NotificationType,
  NotificationTargetType | null
> = {
  SCHEDULE_CHANGE: "SCHEDULE_ITEM",
  DEADLINE: "DEADLINE",
  REQUEST_STATUS: "REQUEST",
  ANNOUNCEMENT: null,
};

export function isNotificationPublicId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function isNotificationType(
  value: string,
): value is NotificationType {
  return notificationTypes.some((type) => type === value);
}

export function buildNotificationTargetHref(
  type: NotificationType,
  targetType: NotificationTargetType | null,
  targetId: string | null,
): string | null {
  if (
    targetByType[type] === null ||
    targetByType[type] !== targetType ||
    !targetId
  ) {
    return null;
  }

  switch (targetType) {
    case "SCHEDULE_ITEM":
      return /^\d+$/.test(targetId) &&
        Number.isSafeInteger(Number(targetId)) &&
        Number(targetId) > 0
        ? `/schedule?view=week&lesson=${encodeURIComponent(targetId)}#lesson-${encodeURIComponent(targetId)}`
        : null;
    case "DEADLINE":
      return `/deadlines#deadline-${encodeURIComponent(targetId)}`;
    case "REQUEST":
      return isNotificationPublicId(targetId)
        ? `/requests/${targetId}`
        : null;
  }
}

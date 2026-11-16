import type {
  NotificationTargetType,
  NotificationType,
} from "@/generated/prisma/enums";

const notificationTypes: NotificationType[] = [
  "SCHEDULE_CHANGE",
  "DEADLINE",
  "REQUEST_STATUS",
];

export const notificationTypeLabels: Record<NotificationType, string> = {
  SCHEDULE_CHANGE: "Перенос занятия",
  DEADLINE: "Дедлайн",
  REQUEST_STATUS: "Изменение статуса заявки",
};

const targetByType: Record<NotificationType, NotificationTargetType> = {
  SCHEDULE_CHANGE: "SCHEDULE_ITEM",
  DEADLINE: "DEADLINE",
  REQUEST_STATUS: "REQUEST",
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
  targetType: NotificationTargetType,
  targetId: string,
): string | null {
  if (targetByType[type] !== targetType || targetId.length === 0) {
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

import type { NotificationType } from "@/generated/prisma/enums";
import type { StudentNotificationItem } from "@/lib/notification-types";

export type NotificationFilter = "all" | "unread";
export type NotificationTypeFilter =
  | "schedule"
  | "deadline"
  | "request"
  | "announcement";
export type NotificationGroupKey = "today" | "yesterday" | "week" | "earlier";

export type NotificationGroup = {
  key: NotificationGroupKey;
  label: string;
  notifications: StudentNotificationItem[];
};

const typeByFilter: Record<NotificationTypeFilter, NotificationType> = {
  schedule: "SCHEDULE_CHANGE",
  deadline: "DEADLINE",
  request: "REQUEST_STATUS",
  announcement: "ANNOUNCEMENT",
};

export function parseNotificationFilter(value: string | null): NotificationFilter {
  return value === "unread" ? "unread" : "all";
}

export function parseNotificationTypeFilter(
  value: string | null,
): NotificationTypeFilter | null {
  return value && Object.hasOwn(typeByFilter, value)
    ? (value as NotificationTypeFilter)
    : null;
}

export function toNotificationType(
  value: NotificationTypeFilter,
): NotificationType {
  return typeByFilter[value];
}

export function filterNotifications(
  notifications: readonly StudentNotificationItem[],
  filter: NotificationFilter,
  type: NotificationTypeFilter | null,
  query: string,
): StudentNotificationItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  return notifications.filter((notification) => {
    if (filter === "unread" && notification.readAt !== null) return false;
    if (type && notification.type !== typeByFilter[type]) return false;
    if (!normalizedQuery) return true;
    return [
      notification.title,
      notification.text,
      notification.context,
      notification.source,
    ].some((part) => part.toLocaleLowerCase("ru-RU").includes(normalizedQuery));
  });
}

function moscowDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Moscow",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function groupNotificationsByDate(
  notifications: readonly StudentNotificationItem[],
  now = new Date(),
): NotificationGroup[] {
  const today = moscowDateKey(now);
  const yesterday = addDays(today, -1);
  const weekStart = startOfWeek(today);
  const grouped: Record<NotificationGroupKey, StudentNotificationItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };
  for (const notification of notifications) {
    const key = moscowDateKey(new Date(notification.createdAt));
    const bucket: NotificationGroupKey =
      key === today
        ? "today"
        : key === yesterday
          ? "yesterday"
          : key >= weekStart
            ? "week"
            : "earlier";
    grouped[bucket].push(notification);
  }
  const labels: Record<NotificationGroupKey, string> = {
    today: "Сегодня",
    yesterday: "Вчера",
    week: "Эта неделя",
    earlier: "Ранее",
  };
  return (Object.keys(grouped) as NotificationGroupKey[])
    .filter((key) => grouped[key].length > 0)
    .map((key) => ({ key, label: labels[key], notifications: grouped[key] }));
}

export function createNotificationUrl(
  current: URLSearchParams,
  updates: Record<string, string | null>,
): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `/notifications?${query}` : "/notifications";
}

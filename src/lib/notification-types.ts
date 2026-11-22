import type { DeadlineRemaining } from "@/lib/deadline-utils";
import type {
  DeadlineFormat,
  NotificationTargetType,
  NotificationType,
} from "@/generated/prisma/enums";

export type NotificationDeadlineDetails = {
  id: string;
  title: string;
  subject: string;
  topic: string | null;
  format: DeadlineFormat;
  taskUrl: string | null;
  location: string | null;
  dueAt: string;
  dueLabel: string;
  statusLabel: string;
  remainingLabel: string | null;
  remaining: DeadlineRemaining | null;
};

export type NotificationDetails = {
  schedule?: {
    dateLabel: string;
    timeLabel: string;
    previousTimeLabel: string | null;
    previousDateLabel: string | null;
    previousRoom: string | null;
    room: string;
    changeNote: string | null;
  };
  request?: {
    requestNumber: string;
    statusLabel: string;
    serviceLabel: string;
  };
  deadline?: NotificationDeadlineDetails;
};

export type StudentNotificationItem = {
  publicId: string;
  type: NotificationType;
  title: string;
  text: string;
  targetType: NotificationTargetType | null;
  targetId: string | null;
  href: string | null;
  createdAt: string;
  readAt: string | null;
  source: string;
  context: string;
  targetAvailable: boolean | null;
  details: NotificationDetails;
};

export type NotificationTypeCounts = Record<NotificationType, number>;

export type NotificationFeedPage = {
  notifications: StudentNotificationItem[];
  unreadCount: number;
  typeCounts: NotificationTypeCounts;
  hasMore: boolean;
  nextCursor: string | null;
};

export type NotificationReadActionResult = {
  unreadCount: number;
};

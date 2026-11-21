import type {
  NotificationTargetType,
  NotificationType,
} from "@/generated/prisma/enums";

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
    statusLabel: string;
    serviceLabel: string;
  };
  deadline?: {
    subject: string;
    dueAt: string;
    statusLabel: string;
    remainingLabel: string | null;
  };
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

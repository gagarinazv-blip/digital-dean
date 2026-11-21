import type { NotificationType } from "@/generated/prisma/enums";
import styles from "./notification-symbol.module.css";

const typeClass: Record<NotificationType, string> = {
  SCHEDULE_CHANGE: styles.schedule,
  DEADLINE: styles.deadline,
  REQUEST_STATUS: styles.request,
  ANNOUNCEMENT: styles.announcement,
};

export function NotificationSymbol({ type }: { type: NotificationType }) {
  return (
    <span className={`${styles.icon} ${typeClass[type]}`} aria-hidden="true">
      <svg
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        viewBox="0 0 24 24"
      >
        {type === "SCHEDULE_CHANGE" ? (
          <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </>
        ) : type === "DEADLINE" ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </>
        ) : type === "REQUEST_STATUS" ? (
          <>
            <path d="M5 4h14v16H5zM8 8h8M8 12h5M8 16h6" />
            <path d="m15 15 1.5 1.5L20 13" />
          </>
        ) : (
          <>
            <path d="M4 5h16v12H9l-5 4z" />
            <path d="M8 9h8M8 13h5" />
          </>
        )}
      </svg>
    </span>
  );
}

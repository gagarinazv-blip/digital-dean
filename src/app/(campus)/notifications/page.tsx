import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { markAllNotificationsReadAction } from "@/app/(campus)/notifications/actions";
import type { NotificationTargetType, NotificationType } from "@/generated/prisma/enums";
import { notificationTypeLabels } from "@/lib/notification-workflow";
import { cleanStudentFacingText } from "@/lib/campus-labels";
import { getStudentNotifications } from "@/lib/notification-data";
import { requireStudent } from "@/lib/student";
import styles from "./notifications.module.css";

export const instant = false;

const notificationDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

function NotificationIcon({ type }: { type: NotificationType | null }) {
  return (
    <svg
      aria-hidden="true"
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
      ) : (
        <>
          <path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M14 3v5h5M8 13h8M8 17h6" />
        </>
      )}
    </svg>
  );
}

function getTargetLabel(targetType: NotificationTargetType | null): string {
  switch (targetType) {
    case "SCHEDULE_ITEM":
      return "Перейти к занятию";
    case "DEADLINE":
      return "Открыть задание";
    case "REQUEST":
      return "Открыть заявку";
    default:
      return "Открыть событие";
  }
}

type NotificationsPageProps = {
  searchParams?: Promise<{ filter?: string | string[] }>;
};

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const student = await requireStudent();
  const notifications = await getStudentNotifications(student.id);
  const params = await searchParams;
  const filterValue = params?.filter;
  const activeFilter =
    (Array.isArray(filterValue) ? filterValue[0] : filterValue) === "unread"
      ? "unread"
      : "all";
  const displayedNotifications = activeFilter === "unread"
    ? notifications.filter((notification) => notification.readAt === null)
    : notifications;
  const unreadCount = notifications.filter(
    (notification) => notification.readAt === null,
  ).length;
  const selectedNotification = displayedNotifications[0];

  return (
    <CampusSection
      eyebrow="Новости и сроки"
      title="Уведомления"
      description={
        unreadCount
          ? `${unreadCount} непрочитанных · важное об учёбе и заявках`
          : "Важное об учёбе и заявках."
      }
    >
      <div className={styles.stack}>
        <div className={styles.toolbar}>
          <nav className={styles.segments} aria-label="Фильтр уведомлений">
            <Link
              aria-current={activeFilter === "all" ? "page" : undefined}
              className={activeFilter === "all" ? styles.segmentActive : ""}
              href="/notifications"
            >
              Все
            </Link>
            <Link
              aria-current={activeFilter === "unread" ? "page" : undefined}
              className={activeFilter === "unread" ? styles.segmentActive : ""}
              href="/notifications?filter=unread"
            >
              Непрочитанные
              {unreadCount > 0 && <span>{unreadCount}</span>}
            </Link>
          </nav>
          {unreadCount > 0 && (
            <form action={markAllNotificationsReadAction}>
              <button className={styles.secondaryButton} type="submit">
                Прочитать все <span aria-hidden="true">✓✓</span>
              </button>
            </form>
          )}
        </div>

        {displayedNotifications.length === 0 ? (
          <div className={styles.empty}>
            <strong>
              {activeFilter === "unread"
                ? "Непрочитанных уведомлений нет"
                : "Уведомлений пока нет"}
            </strong>
            <p>
              {activeFilter === "unread"
                ? "Вы прочитали все уведомления."
                : "Здесь появятся важные изменения и напоминания для вас."}
            </p>
          </div>
        ) : (
          <div className={styles.notificationGrid}>
            <section
              className={styles.eventsPanel}
              aria-labelledby="latest-events-title"
            >
              <div className={styles.panelHeading}>
                <h2 id="latest-events-title">Последние события</h2>
                <span>{displayedNotifications.length}</span>
              </div>
              <ul className={styles.list}>
                {displayedNotifications.map((notification) => (
                  <li
                    className={`${styles.item} ${
                      notification.readAt === null ? styles.unread : ""
                    }`}
                    key={notification.publicId}
                  >
                    <Link
                      aria-label={`${notification.readAt === null ? "Новое уведомление. " : ""}${cleanStudentFacingText(notification.title)}`}
                      className={styles.itemLink}
                      href={`/notifications/${notification.publicId}`}
                    >
                      <span className={styles.icon}>
                        <NotificationIcon type={notification.type} />
                      </span>
                      <span className={styles.itemContent}>
                        <span className={styles.heading}>
                          <span className={styles.type}>
                            {notification.type
                              ? notificationTypeLabels[notification.type]
                              : "Уведомление"}
                          </span>
                          {notification.readAt === null && (
                            <span className={styles.unreadMark}>Новое</span>
                          )}
                        </span>
                        <strong className={styles.itemTitle}>
                          {cleanStudentFacingText(notification.title)}
                        </strong>
                        <span className={styles.context}>
                          {notificationDateFormatter.format(
                            notification.createdAt,
                          )}{" "}
                          · открыть контекст
                        </span>
                      </span>
                      <span className={styles.itemArrow} aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {selectedNotification && (
              <aside
                className={styles.detailPanel}
                aria-labelledby="selected-notification-title"
              >
                <p className={styles.detailEyebrow}>
                  {selectedNotification.type
                    ? notificationTypeLabels[selectedNotification.type]
                    : "Уведомление"}
                </p>
                <h2 id="selected-notification-title">
                  {cleanStudentFacingText(selectedNotification.title)}
                </h2>
                <time dateTime={selectedNotification.createdAt.toISOString()}>
                  {notificationDateFormatter.format(
                    selectedNotification.createdAt,
                  )}
                </time>
                <p className={styles.detailText}>
                  {cleanStudentFacingText(selectedNotification.text)}
                </p>
                <Link
                  className={styles.primaryButton}
                  href={`/notifications/${selectedNotification.publicId}`}
                >
                  {getTargetLabel(selectedNotification.targetType)}
                  <span aria-hidden="true">→</span>
                </Link>
              </aside>
            )}
          </div>
        )}
      </div>
    </CampusSection>
  );
}

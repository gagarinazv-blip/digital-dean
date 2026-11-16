import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { markAllNotificationsReadAction } from "@/app/(campus)/notifications/actions";
import { notificationTypeLabels } from "@/lib/notification-workflow";
import { getStudentNotifications } from "@/lib/notification-data";
import { requireStudent } from "@/lib/student";
import styles from "./notifications.module.css";

export const instant = false;

const notificationDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

export default async function NotificationsPage() {
  const student = await requireStudent();
  const notifications = await getStudentNotifications(student.id);
  const hasUnread = notifications.some(
    (notification) => notification.readAt === null,
  );

  return (
    <CampusSection
      eyebrow="Новости и сроки"
      title="Уведомления"
      description="Изменения расписания, сроки и статусы ваших заявок."
    >
      <div className={styles.stack}>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <button className={styles.secondaryButton} type="submit">
              Отметить все прочитанными
            </button>
          </form>
        )}
        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <strong>Уведомлений пока нет</strong>
            <p>Здесь появятся важные изменения и напоминания для вас.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {notifications.map((notification) => (
              <li
                className={`${styles.item} ${
                  notification.readAt === null ? styles.unread : ""
                }`}
                key={notification.publicId}
              >
                <Link
                  aria-label={`${notification.readAt === null ? "Новое уведомление. " : ""}${notification.title}`}
                  className={styles.itemLink}
                  href={`/notifications/${notification.publicId}`}
                >
                  <div className={styles.heading}>
                    <span className={styles.type}>
                      {notification.type
                        ? notificationTypeLabels[notification.type]
                        : "Уведомление"}
                    </span>
                    {notification.readAt === null && (
                      <span className={styles.unreadMark}>Новое</span>
                    )}
                  </div>
                  <h2>{notification.title}</h2>
                  <p>{notification.text}</p>
                  <time dateTime={notification.createdAt.toISOString()}>
                    {notificationDateFormatter.format(notification.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CampusSection>
  );
}

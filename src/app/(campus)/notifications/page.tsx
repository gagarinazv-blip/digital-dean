import { Suspense } from "react";
import { CampusSection } from "@/components/campus-section";
import { countUnreadStudentNotifications } from "@/lib/notification-data";
import { requireStudent } from "@/lib/student";
import { NotificationCenter } from "./notification-center";
import styles from "./notifications.module.css";

export const instant = false;

export default async function NotificationsPage() {
  const student = await requireStudent();
  const unreadCount = await countUnreadStudentNotifications(student.id);

  return (
    <CampusSection
      eyebrow="Новости и сроки"
      title="Уведомления"
      illustration="notifications"
      tone="wine"
      description="Важное об учёбе, расписании и заявках."
    >
      <Suspense
        fallback={
          <div aria-busy="true" className={styles.skeleton}>
            <span />
            <span />
            <span />
          </div>
        }
      >
        <NotificationCenter
          initialUnreadCount={unreadCount}
          studentId={student.id}
        />
      </Suspense>
    </CampusSection>
  );
}

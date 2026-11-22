import { Suspense } from "react";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { countUnreadStudentNotifications } from "@/lib/notification-data";
import { requireStudent } from "@/lib/student";
import { NotificationCenter } from "./notification-center";
import styles from "./notifications.module.css";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<CampusLoading label="уведомления" />}>
      <NotificationsContent />
    </Suspense>
  );
}

async function NotificationsContent() {
  const student = await requireStudent();
  const unreadCount = await countUnreadStudentNotifications(student.id);

  return (
    <CampusSection
      eyebrow="Новости и сроки"
      title="Уведомления"
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

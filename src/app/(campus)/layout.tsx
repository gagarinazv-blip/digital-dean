import { Suspense, type ReactNode } from "react";
import { CampusLayout } from "@/components/campus-layout";
import { countUnreadStudentNotifications } from "@/lib/notification-data";
import { requireStudentContext } from "@/lib/student";

export default async function CampusRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main aria-busy="true">
          Проверяем вход в личный кабинет…
        </main>
      }
    >
      <ProtectedCampus>{children}</ProtectedCampus>
    </Suspense>
  );
}

async function ProtectedCampus({ children }: { children: ReactNode }) {
  const { student } = await requireStudentContext();
  const unreadNotificationCount = await countUnreadStudentNotifications(
    student.id,
  );
  return (
    <CampusLayout
      student={student}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </CampusLayout>
  );
}

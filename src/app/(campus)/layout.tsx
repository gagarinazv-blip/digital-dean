import { Suspense, type ReactNode } from "react";
import { CampusLayout } from "@/components/campus-layout";
import { CampusLoading } from "@/components/campus-section";
import { DemoNowProvider } from "@/components/demo-now";
import { DEMO_NOW, getDemoNow } from "@/lib/demo-date";
import { countUnreadStudentNotifications } from "@/lib/notification-data";
import { requireStudentContext } from "@/lib/student";

export const instant = false;

export default async function CampusRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <CampusLoading label="личный кабинет" />
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
    <DemoNowProvider
      isFrozen={DEMO_NOW !== null}
      nowIso={getDemoNow().toISOString()}
    >
      <CampusLayout
        student={student}
        unreadNotificationCount={unreadNotificationCount}
      >
        {children}
      </CampusLayout>
    </DemoNowProvider>
  );
}

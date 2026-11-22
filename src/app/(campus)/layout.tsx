import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { CampusLayout } from "@/components/campus-layout";
import "@/app/section-motion.css";
import { CampusLoading } from "@/components/campus-section";
import { DemoNowProvider } from "@/components/demo-now";
import {
  CAMPUS_SIDEBAR_COLLAPSED,
  CAMPUS_SIDEBAR_COOKIE,
} from "@/lib/campus-sidebar";
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
  const sidebar = (await cookies()).get(CAMPUS_SIDEBAR_COOKIE)?.value;
  return (
    <DemoNowProvider
      isFrozen={DEMO_NOW !== null}
      nowIso={getDemoNow().toISOString()}
    >
      <CampusLayout
        isSidebarCollapsed={sidebar === CAMPUS_SIDEBAR_COLLAPSED}
        student={student}
        unreadNotificationCount={unreadNotificationCount}
      >
        {children}
      </CampusLayout>
    </DemoNowProvider>
  );
}

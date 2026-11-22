import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { StaffLayout } from "@/components/staff-layout";
import { CampusLoading } from "@/components/campus-section";
import { DemoNowProvider } from "@/components/demo-now";
import { DEMO_NOW, getDemoNow } from "@/lib/demo-date";
import {
  STAFF_SIDEBAR_COLLAPSED,
  STAFF_SIDEBAR_COOKIE,
} from "@/lib/staff-sidebar";
import { requireStaffContext } from "@/lib/staff";

export const instant = false;

export default async function StaffRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <CampusLoading label="кабинет сотрудника" />
      }
    >
      <ProtectedStaff>{children}</ProtectedStaff>
    </Suspense>
  );
}

async function ProtectedStaff({ children }: { children: ReactNode }) {
  const { staff, isManagerAccount } = await requireStaffContext();
  const sidebar = (await cookies()).get(STAFF_SIDEBAR_COOKIE)?.value;
  return (
    <DemoNowProvider
      isFrozen={DEMO_NOW !== null}
      nowIso={getDemoNow().toISOString()}
    >
      <StaffLayout
        isManagerAccount={isManagerAccount}
        isSidebarCollapsed={sidebar === STAFF_SIDEBAR_COLLAPSED}
        staff={staff}
      >
        {children}
      </StaffLayout>
    </DemoNowProvider>
  );
}

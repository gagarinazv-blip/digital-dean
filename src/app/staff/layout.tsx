import { Suspense, type ReactNode } from "react";
import { StaffLayout } from "@/components/staff-layout";
import { CampusLoading } from "@/components/campus-section";
import { DemoNowProvider } from "@/components/demo-now";
import { DEMO_NOW, getDemoNow } from "@/lib/demo-date";
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
  return (
    <DemoNowProvider
      isFrozen={DEMO_NOW !== null}
      nowIso={getDemoNow().toISOString()}
    >
      <StaffLayout isManagerAccount={isManagerAccount} staff={staff}>
        {children}
      </StaffLayout>
    </DemoNowProvider>
  );
}

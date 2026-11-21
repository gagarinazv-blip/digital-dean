import { Suspense, type ReactNode } from "react";
import { StaffLayout } from "@/components/staff-layout";
import { CampusLoading } from "@/components/campus-section";
import { requireStaff } from "@/lib/staff";

export default function StaffRouteLayout({
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
  const staff = await requireStaff();
  return <StaffLayout staff={staff}>{children}</StaffLayout>;
}

import { Suspense, type ReactNode } from "react";
import { StaffLayout } from "@/components/staff-layout";
import { requireStaff } from "@/lib/staff";

export const instant = false;

export default async function StaffRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main aria-busy="true">
          Проверяем вход сотрудника…
        </main>
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

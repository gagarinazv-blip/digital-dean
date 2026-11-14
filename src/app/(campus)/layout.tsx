import { Suspense, type ReactNode } from "react";
import { CampusLayout } from "@/components/campus-layout";
import { requireStudent } from "@/lib/student";

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
  const student = await requireStudent();
  return <CampusLayout student={student}>{children}</CampusLayout>;
}

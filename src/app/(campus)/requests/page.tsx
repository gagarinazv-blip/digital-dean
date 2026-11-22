import { Suspense } from "react";
import { CampusLoading } from "@/components/campus-section";
import { HelpWorkspace } from "@/app/(campus)/help/page";

export default function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    q?: string | string[];
    status?: string | string[];
    selected?: string | string[];
  }>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="заявки" />}>
      <HelpWorkspace searchParams={searchParams} defaultTab="requests" />
    </Suspense>
  );
}

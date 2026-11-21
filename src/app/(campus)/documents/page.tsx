import { Suspense } from "react";
import { CampusLoading } from "@/components/campus-section";
import { HelpWorkspace } from "@/app/(campus)/help/page";

export default function DocumentsPage({
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
    <Suspense fallback={<CampusLoading label="документы и заявки" />}>
      <HelpWorkspace searchParams={searchParams} defaultTab="catalog" />
    </Suspense>
  );
}

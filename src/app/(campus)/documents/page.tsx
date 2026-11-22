import { Suspense } from "react";
import { HelpWorkspace } from "@/app/(campus)/help/page";
import { CampusLoading } from "@/components/campus-section";

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
    <Suspense fallback={<CampusLoading label="документы" />}>
      <HelpWorkspace searchParams={searchParams} defaultTab="catalog" />
    </Suspense>
  );
}

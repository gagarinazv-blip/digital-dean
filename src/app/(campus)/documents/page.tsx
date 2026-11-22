import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CampusLoading } from "@/components/campus-section";
import { HelpWorkspace } from "@/app/(campus)/help/page";

async function DocumentsContent({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    q?: string | string[];
    status?: string | string[];
    selected?: string | string[];
    category?: string | string[];
    year?: string | string[];
    folder?: string | string[];
  }>;
}) {
  const query = await searchParams;
  if (query.tab === "portfolio") {
    redirect("/opportunities/portfolio");
  }
  return <HelpWorkspace searchParams={searchParams} defaultTab="catalog" />;
}

export default function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    q?: string | string[];
    status?: string | string[];
    selected?: string | string[];
    category?: string | string[];
    year?: string | string[];
    folder?: string | string[];
  }>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="документы и заявки" />}>
      <DocumentsContent searchParams={searchParams} />
    </Suspense>
  );
}

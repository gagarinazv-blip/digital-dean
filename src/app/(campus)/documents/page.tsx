import { redirect } from "next/navigation";
import { HelpWorkspace } from "@/app/(campus)/help/page";

export default async function DocumentsPage({
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
  return HelpWorkspace({
    searchParams,
    defaultTab: "catalog",
  });
}

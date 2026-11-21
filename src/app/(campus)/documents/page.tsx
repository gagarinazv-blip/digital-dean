import { HelpWorkspace } from "@/app/(campus)/help/page";

export const instant = false;

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
  return HelpWorkspace({
    searchParams,
    defaultTab: "documents",
  });
}

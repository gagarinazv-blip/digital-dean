import { HelpWorkspace } from "@/app/(campus)/help/page";

export const instant = false;

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
  return HelpWorkspace({
    searchParams,
    defaultTab: "requests",
  });
}

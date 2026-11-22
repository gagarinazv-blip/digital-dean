import type { ReactNode } from "react";
import { OpportunitySectionNavigation } from "@/components/opportunity-section-navigation";

export default function OpportunitiesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OpportunitySectionNavigation />
      {children}
    </>
  );
}

import { Suspense } from "react";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { PortfolioView } from "@/app/(campus)/documents/portfolio-view";
import { getStudentPortfolio } from "@/lib/portfolio";
import { requireStudent } from "@/lib/student";

type PortfolioSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  year?: string | string[];
  folder?: string | string[];
}>;

async function PortfolioContent({
  searchParams,
}: {
  searchParams: PortfolioSearchParams;
}) {
  const student = await requireStudent();
  const portfolio = await getStudentPortfolio(student.id);
  return (
    <CampusSection eyebrow="Возможности" title="Портфолио"
      illustration="achievements"
      tone="sand" description="Ваши дипломы, сертификаты и достижения.">
      <PortfolioView folders={portfolio.folders} items={portfolio.items} searchParams={await searchParams} />
    </CampusSection>
  );
}

export default function PortfolioPage({
  searchParams,
}: {
  searchParams: PortfolioSearchParams;
}) {
  return (
    <Suspense fallback={<CampusLoading label="портфолио" />}>
      <PortfolioContent searchParams={searchParams} />
    </Suspense>
  );
}

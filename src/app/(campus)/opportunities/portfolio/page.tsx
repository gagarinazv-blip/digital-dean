import { Suspense } from "react";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { PortfolioView } from "@/app/(campus)/documents/portfolio-view";
import { getStudentPortfolio } from "@/lib/portfolio";
import { requireStudent } from "@/lib/student";

async function PortfolioContent() {
  const student = await requireStudent();
  const portfolio = await getStudentPortfolio(student.id);
  return (
    <CampusSection eyebrow="Возможности" title="Портфолио" description="Ваши дипломы, сертификаты и достижения.">
      <PortfolioView folders={portfolio.folders} items={portfolio.items} searchParams={{}} />
    </CampusSection>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<CampusLoading label="портфолио" />}>
      <PortfolioContent />
    </Suspense>
  );
}

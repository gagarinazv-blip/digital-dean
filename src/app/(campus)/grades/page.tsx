import { CampusPlaceholder, CampusSection } from "@/components/campus-section";

export default function GradesPage() {
  return (
    <CampusSection
      eyebrow="Учебные результаты"
      title="Оценки"
      description="Раздел появится скоро."
    >
      <CampusPlaceholder description="Здесь появятся оценки по предметам." />
    </CampusSection>
  );
}

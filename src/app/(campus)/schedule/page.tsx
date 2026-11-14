import { CampusPlaceholder, CampusSection } from "@/components/campus-section";

export default function SchedulePage() {
  return (
    <CampusSection
      eyebrow="Учебный план"
      title="Расписание"
      description="Раздел появится скоро."
    >
      <CampusPlaceholder description="Здесь будет расписание занятий на неделю." />
    </CampusSection>
  );
}

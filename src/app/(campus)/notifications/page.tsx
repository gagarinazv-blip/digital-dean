import { CampusPlaceholder, CampusSection } from "@/components/campus-section";

export default function NotificationsPage() {
  return (
    <CampusSection
      eyebrow="Новости и сроки"
      title="Уведомления"
      description="Раздел появится скоро."
    >
      <CampusPlaceholder description="Здесь появятся уведомления для вас и вашей группы." />
    </CampusSection>
  );
}

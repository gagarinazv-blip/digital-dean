import { CampusSection } from "@/components/campus-section";
import styles from "./schedule.module.css";

export default function ScheduleLoading() {
  return (
    <CampusSection
      eyebrow="Учебный план"
      title="Расписание"
      description="Загружаем расписание вашей группы."
    >
      <div aria-busy="true" className={styles.scheduleSkeleton}>
        <span />
        <span />
        <span />
      </div>
    </CampusSection>
  );
}

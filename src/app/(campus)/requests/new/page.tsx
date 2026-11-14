import Link from "next/link";
import { CampusPlaceholder, CampusSection } from "@/components/campus-section";
import styles from "../../../sections.module.css";

export default function NewRequestPage() {
  return (
    <CampusSection
      eyebrow="Обращения"
      title="Новая заявка"
      description="Раздел появится скоро."
    >
      <CampusPlaceholder description="Форма подачи заявки появится здесь.">
        <Link className={styles.link} href="/requests">
          Вернуться к списку заявок
        </Link>
      </CampusPlaceholder>
    </CampusSection>
  );
}

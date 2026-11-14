import Link from "next/link";
import { CampusPlaceholder, CampusSection } from "@/components/campus-section";
import styles from "../../sections.module.css";

export default function RequestsPage() {
  return (
    <CampusSection
      eyebrow="Обращения"
      title="Заявки"
      description="Раздел появится скоро."
    >
      <CampusPlaceholder description="Здесь будут ваши обращения и их статусы.">
        <Link className={styles.link} href="/requests/new">
          Перейти к новой заявке
        </Link>
      </CampusPlaceholder>
    </CampusSection>
  );
}

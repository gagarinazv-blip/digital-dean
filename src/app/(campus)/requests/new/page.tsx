import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { NewRequestForm } from "@/app/(campus)/requests/request-forms";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "../../../sections.module.css";

export default function NewRequestPage() {
  return (
    <CampusSection
      eyebrow="Обращения"
      title="Новая заявка"
      description="Опишите обращение и при необходимости приложите документы."
    >
      <div className={workflowStyles.stack}>
        <section className={workflowStyles.panel}>
          <NewRequestForm />
        </section>
        <Link className={styles.link} href="/requests">
          Вернуться к заявкам
        </Link>
      </div>
    </CampusSection>
  );
}

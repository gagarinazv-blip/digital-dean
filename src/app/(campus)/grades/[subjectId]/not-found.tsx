import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import styles from "./subject.module.css";

export default function SubjectNotFound() {
  return (
    <CampusSection
      eyebrow="Успеваемость"
      title="Дисциплина не найдена"
      description="Эта дисциплина недоступна в вашем учебном плане."
    >
      <Link className={styles.backLink} href="/grades">
        <span aria-hidden="true">←</span> К учебному плану
      </Link>
    </CampusSection>
  );
}

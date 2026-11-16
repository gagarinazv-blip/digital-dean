import { randomUUID } from "node:crypto";
import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { NewRequestForm } from "@/app/(campus)/requests/request-forms";
import { requireStudentContext } from "@/lib/student";
import type { RequestProfileSnapshot } from "@/lib/request-catalog";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "../../../sections.module.css";

export const instant = false;

export default async function NewRequestPage() {
  const { student } = await requireStudentContext();
  const profile: RequestProfileSnapshot = {
    fullName: student.fullName,
    faculty: student.faculty,
    direction: student.direction,
    course: student.course,
    groupName: student.group.name,
    recordBookNumber: student.recordBookNumber,
    studyForm: student.studyForm,
  };

  return (
    <CampusSection
      eyebrow="Обращения"
      title="Новая заявка"
      description="Опишите обращение и при необходимости приложите документы."
    >
      <div className={workflowStyles.stack}>
        <section className={workflowStyles.panel}>
          <NewRequestForm profile={profile} publicId={randomUUID()} />
        </section>
        <Link className={styles.link} href="/requests">
          Вернуться к заявкам
        </Link>
      </div>
    </CampusSection>
  );
}

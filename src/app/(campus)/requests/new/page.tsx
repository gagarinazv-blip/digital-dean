import { randomUUID } from "node:crypto";
import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { NewRequestForm } from "@/app/(campus)/requests/request-forms";
import { requireStudentContext } from "@/lib/student";
import {
  requestCatalog,
  type RequestProfileSnapshot,
} from "@/lib/request-catalog";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "./request-page.module.css";

export const instant = false;

const maxExecutionDays = Math.max(
  ...requestCatalog.map((service) => service.executionDays),
);

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
      eyebrow="Документы"
      title="Новая заявка"
      description="Заполните заявление — профильные сведения подставятся автоматически."
    >
      <div className={styles.content}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/help">Документы</Link>
          <span aria-hidden="true">/</span>
          <span>Справка об обучении</span>
        </nav>
        <div className={styles.layout}>
          <section
            className={`${workflowStyles.panel} ${styles.formPanel}`}
            aria-labelledby="application-data-title"
          >
            <h2 className={styles.panelTitle} id="application-data-title">
              Данные заявления
            </h2>
            <NewRequestForm profile={profile} publicId={randomUUID()} />
          </section>
          <aside
            className={styles.helpPanel}
            aria-labelledby="document-help-title"
          >
            <p className={styles.eyebrow}>Просто и прозрачно</p>
            <h2 id="document-help-title">Как получить документ</h2>
            <ol className={styles.steps}>
              <li>
                <span>01</span>
                <p>Отправьте заявление</p>
              </li>
              <li>
                <span>02</span>
                <p>Деканат проверит сведения</p>
              </li>
              <li>
                <span>03</span>
                <p>Получите уведомление о готовности</p>
              </li>
              <li>
                <span>04</span>
                <p>Скачайте готовый документ</p>
              </li>
            </ol>
            <dl className={styles.serviceDetails}>
              <div>
                <dt>Срок</dt>
                <dd>до {maxExecutionDays} рабочих дней</dd>
              </div>
              <div>
                <dt>Стоимость</dt>
                <dd>Бесплатно</dd>
              </div>
              <div>
                <dt>Нужна помощь?</dt>
                <dd>Деканат · будни, 10:00–17:00</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </CampusSection>
  );
}

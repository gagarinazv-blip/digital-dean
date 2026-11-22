import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampusSection } from "@/components/campus-section";
import { NewRequestForm } from "@/app/(campus)/requests/request-forms";
import { requireStudentContext } from "@/lib/student";
import {
  getRequestCatalogTitle,
  getRequestCatalogEntry,
  getRequestFieldValues,
  isRequestCatalogCode,
  requestCatalog,
  type RequestProfileSnapshot,
} from "@/lib/request-catalog";
import { getStudentRequest } from "@/lib/student-request-data";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "./request-page.module.css";

export const instant = false;

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{
    copy?: string | string[];
    service?: string | string[];
  }>;
}) {
  const { student } = await requireStudentContext();
  const query = await searchParams;
  const copyPublicId = typeof query.copy === "string" ? query.copy : null;
  const serviceCode =
    typeof query.service === "string" && isRequestCatalogCode(query.service)
      ? query.service
      : null;
  let initialValues:
    | {
        catalogCode: (typeof requestCatalog)[number]["code"];
        fields: Record<string, string>;
        description: string;
      }
    | undefined = serviceCode
    ? { catalogCode: serviceCode, fields: {}, description: "" }
    : undefined;

  if (copyPublicId) {
    const sourceRequest = await getStudentRequest(copyPublicId);
    if (
      sourceRequest.status !== "REJECTED" ||
      sourceRequest.catalogCode === null ||
      !isRequestCatalogCode(sourceRequest.catalogCode)
    ) {
      notFound();
    }

    initialValues = {
      catalogCode: sourceRequest.catalogCode,
      fields: getRequestFieldValues(
        sourceRequest.catalogCode,
        sourceRequest.formFields,
      ),
      description: sourceRequest.comment ?? "",
    };
  }

  const profile: RequestProfileSnapshot = {
    fullName: student.fullName,
    faculty: student.faculty,
    direction: student.direction,
    course: student.course,
    groupName: student.group.name,
    recordBookNumber: student.recordBookNumber,
    studyForm: student.studyForm,
  };
  const selectedService =
    getRequestCatalogEntry(initialValues?.catalogCode) ?? requestCatalog[0];

  return (
    <CampusSection
      eyebrow="Документы и заявки"
      title="Новая заявка"
      description="Заполните заявление — профильные сведения подставятся автоматически."
    >
      <div className={styles.content}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/help?tab=catalog">Документы и заявки</Link>
          <span aria-hidden="true">/</span>
          <span>
            {getRequestCatalogTitle(
              initialValues?.catalogCode ?? requestCatalog[0].code,
              "Услуга",
            )}
          </span>
        </nav>
        <div className={styles.layout}>
          <section
            className={`${workflowStyles.panel} ${styles.formPanel}`}
            aria-labelledby="application-data-title"
          >
            {copyPublicId && (
              <p className={workflowStyles.notice}>
                Данные отклонённой заявки подставлены для удобства. Повторная
                подача создаст новую заявку.
              </p>
            )}
            <h2 className={styles.panelTitle} id="application-data-title">
              Данные заявления
            </h2>
            <NewRequestForm
              initialValues={initialValues}
              profile={profile}
              publicId={randomUUID()}
            />
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
                <dd>до {selectedService.executionDays} рабочих дней</dd>
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

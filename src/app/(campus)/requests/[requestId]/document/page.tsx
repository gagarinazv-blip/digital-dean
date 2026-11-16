import Link from "next/link";
import { notFound } from "next/navigation";
import { CampusSection } from "@/components/campus-section";
import { requestTypeLabels } from "@/lib/campus-labels";
import {
  getRequestCatalogTitle,
  getRequestFieldEntries,
  getRequestProfileEntries,
} from "@/lib/request-catalog";
import { getStudentRequest } from "@/lib/student-request-data";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "./document.module.css";

export const instant = false;

const documentDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeZone: "Europe/Moscow",
});

export default async function RequestDocumentPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const request = await getStudentRequest(requestId);
  if (request.status !== "READY") {
    notFound();
  }

  const title = getRequestCatalogTitle(
    request.catalogCode,
    requestTypeLabels[request.type],
  );
  const profileEntries = getRequestProfileEntries(request.profileSnapshot) ?? [];
  const formEntries = getRequestFieldEntries(
    request.catalogCode,
    request.formFields,
  );

  return (
    <CampusSection
      eyebrow="Мои заявки"
      title="Предварительный просмотр"
      description={title}
    >
      <div className={styles.stack}>
        <article className={styles.document}>
          <span className={styles.demoBadge}>
            ДЕМО · НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ ДОКУМЕНТОМ
          </span>
          <h2>{title}</h2>
          <p>
            Документ сформирован{" "}
            {documentDateFormatter.format(request.updatedAt)}.
          </p>
          <p className={styles.documentNumber}>
            Номер заявки: {request.publicId}
          </p>
          <h3>Сведения заявителя</h3>
          <dl className={styles.details}>
            {profileEntries.map((entry) => (
              <div key={entry.label}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
          {formEntries.length > 0 && (
            <>
              <h3>Сведения из заявления</h3>
              <dl className={styles.details}>
                {formEntries.map((entry) => (
                  <div key={entry.id}>
                    <dt>{entry.label}</dt>
                    <dd>{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <p className={styles.disclaimer}>
            Демонстрационный документ для проверки интерфейса. Он не имеет
            юридической силы и не заменяет справку, выданную учебным заведением.
          </p>
        </article>
        <div className={styles.actions}>
          <a
            className={workflowStyles.button}
            download
            href={`/api/requests/${request.publicId}/document`}
          >
            Скачать демонстрационный документ (HTML)
          </a>
          <Link
            className={workflowStyles.secondaryButton}
            href={`/requests/${request.publicId}`}
          >
            Вернуться к заявке
          </Link>
        </div>
      </div>
    </CampusSection>
  );
}

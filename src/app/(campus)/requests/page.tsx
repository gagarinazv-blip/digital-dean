import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getRequestCatalogTitle } from "@/lib/request-catalog";
import { getStudentRequests } from "@/lib/student-request-data";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "../../sections.module.css";
import type { RequestStatus } from "@/generated/prisma/enums";

export const instant = false;

const requestDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeZone: "Europe/Moscow",
});

const requestStatusClasses: Record<RequestStatus, string> = {
  NEW: workflowStyles.statusNew,
  IN_PROGRESS: workflowStyles.statusInProgress,
  NEEDS_INFO: workflowStyles.statusNeedsInfo,
  READY: workflowStyles.statusReady,
  REJECTED: workflowStyles.statusRejected,
  CANCELLED: workflowStyles.statusCancelled,
};

export default async function RequestsPage() {
  const requests = await getStudentRequests();

  return (
    <CampusSection
      eyebrow="Обращения"
      title="Мои заявки"
      description="Здесь можно посмотреть ваши обращения и ответы сотрудников."
    >
      <div className={workflowStyles.stack}>
        <Link className={workflowStyles.button} href="/requests/new">
          Новая заявка
        </Link>
        {requests.length === 0 ? (
          <div className={workflowStyles.empty}>
            Заявок пока нет. Создайте заявку, чтобы обратиться в деканат.
          </div>
        ) : (
          <ul className={styles.list}>
            {requests.map((request) => (
              <li className={styles.listItem} key={request.id}>
                <div className={styles.itemHeader}>
                  <div>
                    <h2>
                      {getRequestCatalogTitle(
                        request.catalogCode,
                        requestTypeLabels[request.type],
                      )}
                    </h2>
                    <p>
                      Создана {requestDateFormatter.format(request.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`${workflowStyles.statusBadge} ${requestStatusClasses[request.status]}`}
                  >
                    {requestStatusLabels[request.status]}
                  </span>
                </div>
                <p>
                  Обновлена {requestDateFormatter.format(request.updatedAt)}
                </p>
                <Link
                  className={styles.link}
                  href={`/requests/${request.publicId}`}
                >
                  Открыть заявку
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CampusSection>
  );
}

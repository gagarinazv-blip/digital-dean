import Link from "next/link";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getRequestCatalogTitle } from "@/lib/request-catalog";
import { getStaffRequestList } from "@/lib/staff-data";
import styles from "./staff.module.css";
import workflowStyles from "@/app/request-workflow.module.css";
import type { RequestStatus } from "@/generated/prisma/enums";

export const instant = false;

const requestDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

const statusSummary: {
  status: RequestStatus;
  title: string;
  tone: string;
}[] = [
  { status: "NEW", title: "Новые", tone: "new" },
  { status: "IN_PROGRESS", title: "В работе", tone: "progress" },
  { status: "NEEDS_INFO", title: "Нужны данные", tone: "attention" },
  { status: "READY", title: "Выполнены", tone: "ready" },
  { status: "REJECTED", title: "Отклонены", tone: "rejected" },
];

const requestStatusClasses: Record<RequestStatus, string> = {
  NEW: workflowStyles.statusNew,
  IN_PROGRESS: workflowStyles.statusInProgress,
  NEEDS_INFO: workflowStyles.statusNeedsInfo,
  READY: workflowStyles.statusReady,
  REJECTED: workflowStyles.statusRejected,
  CANCELLED: workflowStyles.statusCancelled,
};

export default async function StaffHomePage() {
  const { requests } = await getStaffRequestList();
  const counts = new Map(
    statusSummary.map(({ status }) => [
      status,
      requests.filter((request) => request.status === status).length,
    ]),
  );

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <span>Деканат</span>
        <span aria-hidden="true">/</span>
        <span>Заявки</span>
      </div>
      <header className={styles.pageHeading}>
        <h1>Заявки студентов</h1>
        <p>Обработка и контроль заявок, поданных студентами вашего факультета.</p>
      </header>

      <section aria-label="Сводка заявок" className={styles.summary}>
        {statusSummary.map(({ status, title, tone }) => (
          <article className={`${styles.summaryCard} ${styles[tone]}`} key={status}>
            <span aria-hidden="true" className={styles.summaryIcon}>
              {status === "NEW"
                ? "▤"
                : status === "IN_PROGRESS"
                  ? "◈"
                  : status === "NEEDS_INFO"
                    ? "◉"
                    : status === "READY"
                      ? "✓"
                      : "×"}
            </span>
            <div className={styles.summaryContent}>
              <span>{title}</span>
              <strong>{counts.get(status) ?? 0}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.queuePanel} aria-labelledby="queue-title">
        <div className={styles.queueHeading}>
          <div>
            <h2 id="queue-title">Очередь заявок</h2>
            <p>
            {requests.length === 1
              ? "1 заявка доступна по правилам вашего отдела"
              : `${requests.length} заявок доступно по правилам вашего отдела`}
            </p>
          </div>
        </div>
        {requests.length === 0 ? (
          <div className={styles.empty}>
            <span aria-hidden="true">✓</span>
            <strong>Доступных заявок пока нет</strong>
            <p>
              Новые заявки появятся здесь, когда их назначат вам или когда они
              подойдут вашему отделу.
            </p>
          </div>
        ) : (
          <div className={styles.tableScroller} role="region" aria-label="Очередь заявок">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">№ заявки</th>
                  <th scope="col">Студент</th>
                  <th scope="col">Услуга</th>
                  <th scope="col">Дата</th>
                  <th scope="col">Статус</th>
                  <th scope="col">Сотрудник</th>
                  <th scope="col">
                    <span className={styles.visuallyHidden}>Действие</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <Link
                        className={styles.requestNumber}
                        href={`/staff/requests/${request.id}`}
                      >
                        № {request.id}
                      </Link>
                    </td>
                    <td>
                      <span className={styles.studentName}>
                        {request.student.fullName}
                      </span>
                      <span className={styles.studentGroup}>
                        {request.student.group.name}
                      </span>
                    </td>
                    <td>
                      <span className={styles.serviceCell}>
                        <span aria-hidden="true" className={styles.serviceIcon}>
                          {request.type === "CERTIFICATE" ? "▤" : "▧"}
                        </span>
                        {getRequestCatalogTitle(
                          request.catalogCode,
                          requestTypeLabels[request.type],
                        )}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      {requestDateFormatter.format(request.createdAt)}
                    </td>
                    <td>
                      <span
                        className={`${workflowStyles.statusBadge} ${requestStatusClasses[request.status]}`}
                      >
                        {requestStatusLabels[request.status]}
                      </span>
                    </td>
                    <td>
                      {request.assignedToId === null ? (
                        <span className={styles.unassigned}>Не назначен</span>
                      ) : (
                        <span className={styles.staffAssignment}>
                          <span aria-hidden="true">✓</span>
                          Назначена вам
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        aria-label={`Открыть заявку № ${request.id}`}
                        className={styles.openLink}
                        href={`/staff/requests/${request.id}`}
                      >
                        Открыть →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

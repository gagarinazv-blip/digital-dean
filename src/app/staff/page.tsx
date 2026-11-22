import Link from "next/link";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getRequestCatalogTitle } from "@/lib/request-catalog";
import { formatRequestNumber } from "@/lib/request-number";
import { getUniversityDateTimeFormatter } from "@/lib/campus-time";
import { getStaffRequestList } from "@/lib/staff-data";
import styles from "./staff.module.css";
import workflowStyles from "@/app/request-workflow.module.css";
import type { RequestStatus } from "@/generated/prisma/enums";

export const instant = false;

const requestDateFormatter = getUniversityDateTimeFormatter({
  dateStyle: "medium",
  timeStyle: "short",
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

export default async function StaffHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    date?: string | string[];
  }>;
}) {
  const { status: rawStatus, q: rawSearch, date: rawDateFilter } =
    await searchParams;
  const { requests, counts, selectedStatus, searchTerm, dateFilter } =
    await getStaffRequestList(rawStatus, rawSearch, rawDateFilter);
  const hasFilters =
    Boolean(selectedStatus) || Boolean(searchTerm) || dateFilter !== "all";

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <span>Деканат</span>
        <span aria-hidden="true">/</span>
        <span>Заявки</span>
      </div>
      <header className={styles.pageHeading}>
        <h1>Очередь заявок</h1>
        <p>Обработка и контроль заявок, поданных студентами вашего факультета.</p>
      </header>

      <section aria-label="Сводка заявок" className={styles.summary}>
        {statusSummary.map(({ status, title, tone }) => (
          <Link
            aria-current={selectedStatus === status ? "page" : undefined}
            className={`${styles.summaryCard} ${styles[tone]}`}
            href={`/staff/requests?status=${status}`}
            key={status}
          >
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
              <strong>{counts[status]}</strong>
            </div>
          </Link>
        ))}
      </section>

      <section className={styles.queuePanel} aria-labelledby="queue-title">
        <div className={styles.queueHeading}>
          <div>
            <h2 id="queue-title">
              {selectedStatus
                ? `Заявки: ${requestStatusLabels[selectedStatus]}`
                : "Очередь заявок"}
            </h2>
            <p>
              {requests.length === 1
                ? "1 заявка в очереди"
                : `${requests.length} заявок в очереди`}
            </p>
          </div>
          {hasFilters ? (
            <Link className={styles.showAll} href="/staff/requests">
              Сбросить фильтры
            </Link>
          ) : null}
        </div>
        <form
          action="/staff/requests"
          className={styles.queueFilters}
          role="search"
        >
          {selectedStatus && (
            <input name="status" type="hidden" value={selectedStatus} />
          )}
          <label className={styles.queueSearch}>
            <span>Номер заявки или ФИО</span>
            <input
              defaultValue={searchTerm}
              maxLength={100}
              name="q"
              placeholder="Например, часть номера заявки"
              type="search"
            />
          </label>
          <label className={styles.queueDateFilter}>
            <span>Дата подачи</span>
            <select defaultValue={dateFilter} name="date">
              <option value="all">Все даты</option>
              <option value="today">Сегодня</option>
              <option value="week">Последние 7 дней</option>
            </select>
          </label>
          <button className={styles.filterButton} type="submit">
            Найти
          </button>
        </form>
        {requests.length === 0 ? (
          <div className={styles.empty}>
            <span aria-hidden="true">⌕</span>
            <strong>
              {selectedStatus
                ? `Заявок со статусом «${requestStatusLabels[selectedStatus]}» нет`
                : hasFilters
                  ? "Заявки по заданным параметрам не найдены"
                  : "Доступных заявок пока нет"}
            </strong>
            <p>
              {hasFilters
                ? "Измените поисковый запрос, дату или статус."
                : "Новые заявки появятся здесь, когда они будут доступны по правилам вашего отдела."}
            </p>
          </div>
        ) : (
          <div className={styles.tableScroller} role="region" aria-label="Очередь заявок">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Тип заявки</th>
                  <th scope="col">Студент</th>
                  <th scope="col">Ответственный</th>
                  <th scope="col">Дата</th>
                  <th scope="col">Статус</th>
                  <th scope="col">Детали</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <span className={styles.serviceCell}>
                        <span aria-hidden="true" className={styles.serviceIcon}>
                          {request.type === "CERTIFICATE" ? "▤" : "▧"}
                        </span>
                        <span>
                          {formatRequestNumber(request.id)} ·{" "}
                          {getRequestCatalogTitle(
                            request.catalogCode,
                            requestTypeLabels[request.type],
                          )}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={styles.studentName}>
                        {request.student.fullName}
                      </span>
                      <span className={styles.studentGroup}>
                        {request.student.group.name}
                      </span>
                    </td>
                    <td data-label="Ответственный">
                      <span
                        className={
                          request.assignedTo
                            ? styles.assigneeName
                            : styles.assigneeEmpty
                        }
                      >
                        {request.assignedTo?.fullName ?? "Не назначен"}
                      </span>
                    </td>
                    <td data-label="Дата подачи" className={styles.dateCell}>
                      {requestDateFormatter.format(request.createdAt)}
                    </td>
                    <td data-label="Статус">
                      <span
                        className={`${workflowStyles.statusBadge} ${requestStatusClasses[request.status]}`}
                      >
                        {requestStatusLabels[request.status]}
                      </span>
                    </td>
                    <td data-label="Детали">
                      <Link
                        className={styles.openLink}
                        href={`/staff/requests/${request.id}`}
                      >
                        Открыть заявку →
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

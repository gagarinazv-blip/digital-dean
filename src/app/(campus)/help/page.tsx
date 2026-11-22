import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { CampusArchitectureArt } from "@/components/campus-architecture-art";
import { EmptyState } from "@/components/empty-state";
import type { RequestStatus } from "@/generated/prisma/enums";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import {
  getRequestCatalogTitle,
  requestCatalog,
} from "@/lib/request-catalog";
import {
  getStudentDocuments,
  getStudentRequest,
  getStudentRequests,
} from "@/lib/student-request-data";
import { formatRequestNumber } from "@/lib/request-number";
import { getUniversityDateTimeFormatter } from "@/lib/campus-time";
import { RequestSearchForm } from "./request-search-form";
import styles from "./help.module.css";

export const instant = false;

const requestDateFormatter = getUniversityDateTimeFormatter({
  dateStyle: "medium",
});

const requestDateTimeFormatter = getUniversityDateTimeFormatter({
  dateStyle: "medium",
  timeStyle: "short",
});

const requestStatuses = Object.keys(requestStatusLabels) as RequestStatus[];

function isRequestStatus(value: string): value is RequestStatus {
  return requestStatuses.includes(value as RequestStatus);
}

function ServiceIcon({ kind }: { kind: "certificate" | "call" }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {kind === "certificate" ? (
        <>
          <path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M14 3v5h5M8 13h8M8 17h6" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
        </>
      )}
    </svg>
  );
}

function getRequestStatusHint(status: RequestStatus): string {
  switch (status) {
    case "NEW":
      return "Заявка отправлена";
    case "IN_PROGRESS":
      return "Ожидайте решения сотрудника";
    case "NEEDS_INFO":
      return "Ответьте на запрос сотрудника";
    case "READY":
      return "Посмотреть результат";
    case "REJECTED":
      return "Просмотрите причину отказа";
    case "CANCELLED":
      return "Заявка закрыта";
  }
}

function getRequestSelectionHref(
  publicId: string,
  search: string,
  status: RequestStatus | "",
): string {
  const params = new URLSearchParams({
    tab: "requests",
    selected: publicId,
  });
  if (search) {
    params.set("q", search);
  }
  if (status) {
    params.set("status", status);
  }
  return `/requests?${params.toString()}#request-details`;
}

function RecentRequests({
  requests,
}: {
  requests: Awaited<ReturnType<typeof getStudentRequests>>;
}) {
  return (
    <section className={styles.section} aria-labelledby="student-requests-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.kicker}>Статус обработки</p>
          <h2 id="student-requests-title">
            Мои заявки{" "}
            <span className={styles.headingCount}>{requests.length}</span>
          </h2>
        </div>
        <Link
          className={styles.secondaryLink}
          href="/requests?tab=requests"
        >
          Все заявки <span aria-hidden="true">→</span>
        </Link>
      </div>
      {requests.length === 0 ? (
        <EmptyState
          action={
            <Link className={styles.serviceLink} href="#catalog-title">
              Выбрать услугу <span aria-hidden="true">→</span>
            </Link>
          }
          className={styles.emptyState}
          description="Выберите услугу в каталоге, чтобы отправить первое обращение."
          illustration="requests"
          title="Заявок пока нет"
        />
      ) : (
        <ul className={styles.recentRequests}>
          {requests.slice(0, 3).map((request) => (
            <li key={request.id}>
              <Link
                className={styles.recentRequestLink}
                href={getRequestSelectionHref(request.publicId, "", "")}
              >
                <span className={styles.recentRequestMain}>
                  <strong>
                    {getRequestCatalogTitle(
                      request.catalogCode,
                      requestTypeLabels[request.type],
                    )}
                  </strong>
                  <span>{formatRequestNumber(request.id)}</span>
                </span>
                <time
                  className={styles.recentRequestDate}
                  dateTime={request.createdAt.toISOString()}
                >
                  {requestDateFormatter.format(request.createdAt)}
                </time>
                <span
                  className={styles.statusBadge}
                  data-status={request.status}
                >
                  {requestStatusLabels[request.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SelectedRequestPanel({
  request,
}: {
  request: Awaited<ReturnType<typeof getStudentRequest>>;
}) {
  const serviceTitle = getRequestCatalogTitle(
    request.catalogCode,
    requestTypeLabels[request.type],
  );
  const requestNumber = formatRequestNumber(request.id);
  const latestStaffMessage = request.comments
    .filter((comment) => comment.author.role === "STAFF")
    .at(-1);
  const latestStatus = request.statusHistory.at(-1);
  const requestMessage =
    request.status === "NEEDS_INFO" || request.status === "REJECTED"
      ? latestStatus?.comment ?? latestStaffMessage?.content
      : null;
  const resultAttachments =
    request.status === "READY"
      ? request.comments.flatMap((comment) =>
          comment.attachments.filter(
            (attachment) => attachment.kind === "RESULT",
          ),
        )
      : [];
  const history = [...request.statusHistory].reverse();

  return (
    <aside
      className={styles.requestDetails}
      id="request-details"
      aria-labelledby="selected-request-title"
    >
      <div className={styles.detailHeading}>
        <div>
          <p className={styles.detailNumber}>Заявка {requestNumber}</p>
          <h2 id="selected-request-title">{serviceTitle}</h2>
        </div>
        <span className={styles.statusBadge} data-status={request.status}>
          {requestStatusLabels[request.status]}
        </span>
      </div>
      <p className={styles.detailDates}>
        Подана {requestDateFormatter.format(request.createdAt)} · Обновлена{" "}
        {requestDateTimeFormatter.format(request.updatedAt)}
      </p>

      {requestMessage && (
        <section className={styles.staffMessage}>
          <span aria-hidden="true" className={styles.messageIcon}>
            ◉
          </span>
          <div>
            <h3>
              {request.status === "NEEDS_INFO"
                ? "Сотрудник запросил дополнительные сведения"
                : "Комментарий от деканата"}
            </h3>
            <p>{requestMessage}</p>
            {latestStaffMessage && (
              <span>
                Комментарий от деканата ·{" "}
                {requestDateTimeFormatter.format(latestStaffMessage.createdAt)}
              </span>
            )}
          </div>
        </section>
      )}

      {request.status === "READY" && resultAttachments.length > 0 ? (
        <ul className={styles.resultList}>
          {resultAttachments.map((attachment) => (
            <li key={attachment.id}>
              <span title={attachment.fileName}>{attachment.fileName}</span>
              <a
                download
                href={`/api/request-attachments/${attachment.id}`}
              >
                Скачать
              </a>
            </li>
          ))}
        </ul>
      ) : request.status === "READY" ? (
        <p className={styles.resultPending}>
          Решение принято. Файл результата появится здесь после загрузки
          сотрудником.
        </p>
      ) : (
        <Link
          className={styles.detailAction}
          href={`/requests/${request.publicId}`}
        >
          {request.status === "NEEDS_INFO"
            ? "Ответить на запрос"
            : "Открыть заявку"}
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <section className={styles.historySection} aria-labelledby="history-title">
        <h3 id="history-title">История обработки</h3>
        {history.length > 0 ? (
          <ol className={styles.requestTimeline}>
            {history.map((entry, index) => (
              <li
                className={styles.timelineItem}
                data-current={index === 0 ? "true" : undefined}
                key={`${entry.changedAt.toISOString()}-${index}`}
              >
                <span
                  aria-hidden="true"
                  className={styles.timelineMarker}
                  data-status={entry.status}
                >
                  {index === 0 ? "✓" : ""}
                </span>
                <div className={styles.timelineContent}>
                  <strong>{requestStatusLabels[entry.status]}</strong>
                  <time dateTime={entry.changedAt.toISOString()}>
                    {requestDateTimeFormatter.format(entry.changedAt)}
                  </time>
                  <p>
                    {entry.comment ??
                      (entry.status === "NEW"
                        ? "Заявка успешно создана."
                        : entry.status === "IN_PROGRESS"
                          ? "Заявка передана на рассмотрение."
                          : entry.status === "NEEDS_INFO"
                            ? "Запрошены дополнительные сведения."
                            : entry.status === "READY"
                              ? "Решение принято."
                              : entry.status === "REJECTED"
                                ? "Заявка отклонена."
                                : "Заявка отменена.")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.noHistory}>История обработки пока пуста.</p>
        )}
      </section>
    </aside>
  );
}

type HelpWorkspaceProps = {
  searchParams: Promise<{
    tab?: string | string[];
    q?: string | string[];
    status?: string | string[];
    selected?: string | string[];
  }>;
  defaultTab?: "catalog" | "documents" | "requests";
};

export async function HelpWorkspace({
  searchParams,
  defaultTab = "catalog",
}: HelpWorkspaceProps) {
  const query = await searchParams;
  const activeTab =
    query.tab === "requests" || query.tab === "documents" || query.tab === "catalog"
      ? query.tab
      : defaultTab;
  const search = typeof query.q === "string" ? query.q.trim() : "";
  const selectedStatus =
    typeof query.status === "string" && isRequestStatus(query.status)
      ? query.status
      : "";
  const requestedSelection =
    typeof query.selected === "string" ? query.selected : "";
  const normalizedSearch = search.toLocaleLowerCase("ru");
  const requests = await getStudentRequests();
  const documents =
    activeTab === "documents" ? await getStudentDocuments() : [];
  const visibleRequests = requests.filter((request) => {
    if (selectedStatus && request.status !== selectedStatus) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const title = getRequestCatalogTitle(
      request.catalogCode,
      requestTypeLabels[request.type],
    );
    return [
      title,
      request.publicId,
      request.comment ?? "",
      requestStatusLabels[request.status],
    ].some((value) => value.toLocaleLowerCase("ru").includes(normalizedSearch));
  });
  const selectedSummary =
    visibleRequests.find(
      (request) => request.publicId === requestedSelection,
    ) ?? visibleRequests[0];
  const selectedRequest =
    activeTab === "requests" && selectedSummary
      ? await getStudentRequest(selectedSummary.publicId)
      : null;
  const visibleServices = requestCatalog
    .filter((service) => service.active)
    .filter((service) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        service.title,
        service.description,
        ...service.fields.map((field) => field.label),
      ].some((value) =>
        value.toLocaleLowerCase("ru").includes(normalizedSearch),
      );
    });

  return (
    <CampusSection
      eyebrow="Сервисы кампуса"
      title={
        activeTab === "requests"
          ? "Мои заявки"
          : activeTab === "documents"
            ? "Документы"
            : "Документы и заявки"
      }
      description={
        activeTab === "requests"
          ? "История обращений и ход их обработки."
          : activeTab === "documents"
            ? "Готовые документы по обработанным заявкам."
            : "Справки и услуги деканата — подайте заявку и следите за её обработкой."
      }
    >
      <div className={styles.pageContent}>
        {activeTab === "catalog" && (
          <section className={styles.hero} aria-label="Документы и заявки">
            <div className={styles.heroArt} aria-hidden="true">
              <CampusArchitectureArt
                priority
                sizes="(max-width: 767px) 0px, (max-width: 1099px) 36vw, 32vw"
              />
            </div>
            <div className={styles.heroContent}>
              <p className={styles.heroKicker}>Сервисы для студентов</p>
              <h2>Документы и заявки — онлайн</h2>
              <p>
                Каталог услуг, отправка заявления и история общения с деканатом
                — в одном разделе.
              </p>
              <Link className={styles.primaryButton} href="/requests/new">
                Новая заявка <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        )}

        <nav className={styles.tabs} aria-label="Документы и заявки">
          <Link
            aria-current={activeTab === "documents" ? "page" : undefined}
            className={activeTab === "documents" ? styles.activeTab : ""}
            href="/documents?tab=documents"
          >
            Мои документы
          </Link>
          <Link
            aria-current={activeTab === "catalog" ? "page" : undefined}
            className={activeTab === "catalog" ? styles.activeTab : ""}
            href="/documents?tab=catalog"
          >
            Каталог услуг
          </Link>
          <Link
            aria-current={activeTab === "requests" ? "page" : undefined}
            className={activeTab === "requests" ? styles.activeTab : ""}
            href="/requests?tab=requests"
          >
            Мои заявки
            <span className={styles.tabCount}>· {requests.length}</span>
          </Link>
        </nav>

        {activeTab === "catalog" ? (
          <>
            <form action="/documents" className={styles.filterBar} role="search">
              <input name="tab" type="hidden" value={activeTab} />
              <label className={styles.searchField}>
                <span className={styles.visuallyHidden}>Поиск услуг</span>
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <input
                  defaultValue={search}
                  name="q"
                  placeholder="Поиск услуги"
                  type="search"
                />
              </label>
              <button className={styles.searchButton} type="submit">
                Найти
              </button>
            </form>
            <section className={styles.section} aria-labelledby="catalog-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>Выберите подходящую услугу</p>
                  <h2 id="catalog-title">Каталог услуг</h2>
                </div>
              </div>
              {visibleServices.length === 0 ? (
                <EmptyState
                  className={styles.emptyState}
                  description="Измените поисковый запрос и попробуйте ещё раз."
                  illustration="search"
                  title={`По запросу «${search}» услуги не найдены`}
                />
              ) : (
                <div className={styles.serviceGrid}>
                  {visibleServices.map((service) => (
                    <article className={styles.serviceCard} key={service.code}>
                      <span className={styles.serviceIcon}>
                        <ServiceIcon
                          kind={
                            service.code === "CALL_CERTIFICATE"
                              ? "call"
                              : "certificate"
                          }
                        />
                      </span>
                      <h3>{service.title}</h3>
                      <p className={styles.serviceDescription}>
                        {service.description}
                      </p>
                      <span className={styles.serviceMeta}>
                        Электронно · до {service.executionDays} рабочих дней
                      </span>
                      <div className={styles.requirements}>
                        <strong>Для оформления</strong>
                        <ul>
                          {service.fields.map((field) => (
                            <li key={field.id}>{field.label}</li>
                          ))}
                          <li>Данные профиля студента</li>
                        </ul>
                      </div>
                      <Link
                        className={styles.serviceLink}
                        href={`/requests/new?service=${service.code}`}
                      >
                        Выбрать услугу <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <RecentRequests requests={requests} />
          </>
        ) : activeTab === "documents" ? (
          <section className={styles.section} aria-labelledby="documents-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>Результаты обработанных заявок</p>
                <h2 id="documents-title">Мои документы</h2>
              </div>
              <Link className={styles.secondaryLink} href="/documents?tab=catalog">
                Заказать документ <span aria-hidden="true">→</span>
              </Link>
            </div>
            {documents.length === 0 ? (
              <EmptyState
                action={
                  <Link className={styles.serviceLink} href="/documents?tab=catalog">
                    Перейти в каталог услуг <span aria-hidden="true">→</span>
                  </Link>
                }
                className={styles.emptyState}
                description="Когда деканат подготовит документ, он появится здесь для скачивания."
                illustration="documents"
                title="Готовых документов пока нет"
              />
            ) : (
              <div className={styles.documentGrid}>
                {documents.map((document) => (
                  <article className={styles.documentCard} key={document.id}>
                    <div className={styles.documentHeading}>
                      <span className={styles.serviceIcon} aria-hidden="true">
                        <ServiceIcon
                          kind={
                            document.catalogCode === "CALL_CERTIFICATE"
                              ? "call"
                              : "certificate"
                          }
                        />
                      </span>
                      <div>
                        <h3>
                          {getRequestCatalogTitle(
                            document.catalogCode,
                            requestTypeLabels[document.type],
                          )}
                        </h3>
                        <p>
                          Заявка {formatRequestNumber(document.requestId)} ·{" "}
                          {requestDateFormatter.format(document.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <a
                      className={styles.serviceLink}
                      download
                      href={`/api/request-attachments/${document.id}`}
                    >
                      Скачать {document.fileName}
                      <span aria-hidden="true">↓</span>
                    </a>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className={styles.requestWorkspace}>
            <section
              className={styles.requestListColumn}
              aria-label="Список заявок"
            >
              <RequestSearchForm
                routeBase="/requests"
                search={search}
                status={selectedStatus}
              />
              {visibleRequests.length === 0 ? (
                <EmptyState
                  action={
                    <Link
                      className={styles.serviceLink}
                      href={
                        requests.length === 0
                          ? "/documents?tab=catalog"
                          : "/requests?tab=requests"
                      }
                    >
                      {requests.length === 0
                        ? "Выбрать услугу"
                        : "Сбросить фильтры"}
                    </Link>
                  }
                  className={styles.emptyState}
                  description={
                    requests.length === 0
                      ? "Выберите услугу в каталоге, чтобы отправить первое обращение."
                      : "Измените запрос или статус и попробуйте ещё раз."
                  }
                  illustration={requests.length === 0 ? "requests" : "search"}
                  title={
                    requests.length === 0
                      ? "Заявок пока нет"
                      : "Заявки не найдены"
                  }
                />
              ) : (
                <ul className={styles.requestList}>
                  {visibleRequests.map((request) => {
                    const serviceTitle = getRequestCatalogTitle(
                      request.catalogCode,
                      requestTypeLabels[request.type],
                    );
                    const isSelected =
                      request.publicId === selectedSummary?.publicId;
                    return (
                      <li
                        className={styles.requestListItem}
                        data-selected={isSelected ? "true" : undefined}
                        key={request.id}
                      >
                        <Link
                          aria-current={isSelected ? "page" : undefined}
                          className={styles.requestListLink}
                          href={getRequestSelectionHref(
                            request.publicId,
                            search,
                            selectedStatus,
                          )}
                        >
                          <span className={styles.requestListIcon}>
                            <ServiceIcon
                              kind={
                                request.catalogCode === "CALL_CERTIFICATE"
                                  ? "call"
                                  : "certificate"
                              }
                            />
                          </span>
                          <span className={styles.requestListMain}>
                            <strong>{serviceTitle}</strong>
                            <span>
                              {formatRequestNumber(request.id)}
                            </span>
                          </span>
                          <time className={styles.requestListDate}>
                            {requestDateFormatter.format(request.createdAt)}
                          </time>
                          <span className={styles.requestListStatus}>
                            <span
                              className={styles.statusBadge}
                              data-status={request.status}
                            >
                              {requestStatusLabels[request.status]}
                            </span>
                            <small>{getRequestStatusHint(request.status)}</small>
                          </span>
                          <span aria-hidden="true" className={styles.requestChevron}>
                            ›
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            {selectedRequest ? (
              <SelectedRequestPanel request={selectedRequest} />
            ) : (
              <aside className={styles.noSelectedRequest}>
                Выберите заявку, чтобы посмотреть её детали и историю обработки.
              </aside>
            )}
          </div>
        )}
      </div>
    </CampusSection>
  );
}

export default function HelpPage({
  searchParams,
}: Pick<HelpWorkspaceProps, "searchParams">) {
  return HelpWorkspace({ searchParams });
}

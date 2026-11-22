import { DateTimeStack } from "@/components/date-time-stack";
import { Suspense } from "react";
import Link from "next/link";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { EmptyState } from "@/components/empty-state";
import type { Prisma } from "@/generated/prisma/client";
import type {
  OpportunityDirection,
  OpportunityType,
  RequestStatus,
} from "@/generated/prisma/enums";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getCertificateForms } from "@/lib/certificate-forms";
import {
  formatDeliveryMethods,
  getRequestCatalogTitle,
} from "@/lib/request-catalog";
import { getRequestProfileSnapshot } from "@/lib/request-profile";
import {
  getStudentDocuments,
  getStudentRequest,
  getStudentRequests,
} from "@/lib/student-request-data";
import { formatRequestNumber } from "@/lib/request-number";
import { getStudentPortfolio } from "@/lib/portfolio";
import { requireStudent, requireStudentContext } from "@/lib/student";
import { getPrisma } from "@/lib/prisma";
import {
  opportunityDirectionLabels,
  opportunityTypeConfig,
} from "@/lib/opportunity-catalog";
import { PortfolioView } from "@/app/(campus)/documents/portfolio-view";
import { RequestWindow } from "@/app/(campus)/requests/request-window";
import { RequestSearchForm } from "./request-search-form";
import styles from "./help.module.css";

const requestStatuses = Object.keys(requestStatusLabels) as RequestStatus[];
const opportunityApplicationStatusLabels = {
  SUBMITTED: "Отправлена",
  IN_REVIEW: "На рассмотрении",
  NEEDS_INFO: "Нужны уточнения",
  ACCEPTED: "Принята",
  REJECTED: "Отклонена",
  WITHDRAWN: "Отозвана",
} as const;

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
                      request.formSchemaSnapshot,
                    )}
                  </strong>
                  <span>{formatRequestNumber(request.id)}</span>
                </span>
                <DateTimeStack
                  className={styles.recentRequestDate}
                  value={request.createdAt}
                />
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
    request.formSchemaSnapshot,
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
      <dl className={styles.detailDates}>
        <div>
          <dt>Подана</dt>
          <dd>
            <DateTimeStack value={request.createdAt} />
          </dd>
        </div>
        <div>
          <dt>Обновлена</dt>
          <dd>
            <DateTimeStack value={request.updatedAt} />
          </dd>
        </div>
      </dl>

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
              <DateTimeStack value={latestStaffMessage.createdAt} />
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
                  <DateTimeStack value={entry.changedAt} />
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
    category?: string | string[];
    year?: string | string[];
    folder?: string | string[];
  }>;
  defaultTab?: "catalog" | "documents" | "requests" | "portfolio";
};

export async function HelpWorkspace({
  searchParams,
  defaultTab = "catalog",
}: HelpWorkspaceProps) {
  const query = await searchParams;
  const activeTab =
    query.tab === "requests" ||
    query.tab === "documents" ||
    query.tab === "portfolio" ||
    query.tab === "catalog"
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
  const portfolio =
    activeTab === "portfolio"
      ? await getStudentPortfolio((await requireStudent()).id)
      : { folders: [], items: [] };
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
      request.formSchemaSnapshot,
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
  const catalogEntries =
    activeTab === "catalog" ? await getCertificateForms() : [];
  const requestProfile =
    activeTab === "catalog"
      ? getRequestProfileSnapshot((await requireStudentContext()).student)
      : null;
  const visibleServices = catalogEntries
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
  const searchStudent =
    activeTab === "catalog" && normalizedSearch ? await requireStudent() : null;
  const opportunityTypeMatches = Object.entries(opportunityTypeConfig)
    .filter(([, config]) =>
      config.label.toLocaleLowerCase("ru").includes(normalizedSearch),
    )
    .map(([type]) => type as OpportunityType);
  const opportunityDirectionMatches = Object.entries(opportunityDirectionLabels)
    .filter(([, label]) => label.toLocaleLowerCase("ru").includes(normalizedSearch))
    .map(([direction]) => direction as OpportunityDirection);
  const opportunitySearchTerms: Prisma.OpportunityWhereInput[] = [
    { title: { contains: search, mode: "insensitive" } },
    { organizer: { contains: search, mode: "insensitive" } },
    { shortDescription: { contains: search, mode: "insensitive" } },
    { description: { contains: search, mode: "insensitive" } },
    ...(opportunityTypeMatches.length > 0
      ? [{ type: { in: opportunityTypeMatches } }]
      : []),
    ...(opportunityDirectionMatches.length > 0
      ? [{ directions: { hasSome: opportunityDirectionMatches } }]
      : []),
  ];
  const [matchingOpportunities, matchingApplications] = searchStudent
    ? await Promise.all([
        getPrisma().opportunity.findMany({
          where: { status: "PUBLISHED", OR: opportunitySearchTerms },
          orderBy: [{ deadline: "asc" }, { id: "desc" }],
          take: 8,
          select: {
            id: true,
            title: true,
            type: true,
            organizer: true,
            shortDescription: true,
            description: true,
            deadline: true,
            directions: true,
          },
        }),
        getPrisma().opportunityApplication.findMany({
          where: {
            studentId: searchStudent.id,
            opportunity: { status: { not: "DRAFT" } },
            OR: [
              {
                opportunity: {
                  title: { contains: search, mode: "insensitive" },
                },
              },
              { staffComment: { contains: search, mode: "insensitive" } },
            ],
          },
          orderBy: { submittedAt: "desc" },
          take: 8,
          select: {
            publicId: true,
            status: true,
            kind: true,
            opportunity: { select: { title: true, type: true } },
          },
        }),
      ])
    : [[], []];

  return (
    <CampusSection
      eyebrow="Сервисы для студентов"
      headerAction={
        requestProfile && catalogEntries.length > 0 ? (
          <RequestWindow
            profile={requestProfile}
            services={catalogEntries}
            triggerLabel="Новая заявка"
          />
        ) : null
      }
      illustration={activeTab === "portfolio" ? "achievements" : "documents"}
      tone={activeTab === "portfolio" ? "sand" : "blue"}
      title={
        activeTab === "requests"
          ? "Мои заявки"
          : activeTab === "portfolio"
            ? "Портфолио"
            : activeTab === "documents"
              ? "Готовые документы"
              : "Документы и заявки"
      }
      description={
        activeTab === "requests"
          ? "История обращений и ход их обработки."
          : activeTab === "documents"
            ? "Документы, подготовленные деканатом по вашим заявкам."
            : activeTab === "portfolio"
              ? "Ваши дипломы, сертификаты и другие достижения."
              : "Каталог услуг, отправка заявления и история общения с деканатом — в одном разделе."
      }
    >
      <div className={styles.pageContent}>
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
                        {formatDeliveryMethods(service.deliveryMethods)} · до{" "}
                        {service.executionDays} рабочих дней
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
                      {requestProfile ? (
                        <RequestWindow
                          profile={requestProfile}
                          serviceCode={service.code}
                          services={catalogEntries}
                          triggerClassName={styles.serviceAction}
                          triggerLabel="Заказать"
                        />
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
            {search && (
              <section className={styles.section} aria-labelledby="opportunities-search-title">
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.kicker}>Возможности</p>
                    <h2 id="opportunities-search-title">Возможности и мои заявки</h2>
                  </div>
                </div>
                {matchingOpportunities.length === 0 &&
                matchingApplications.length === 0 ? (
                  <p role="status">По запросу «{search}» возможности и заявки не найдены.</p>
                ) : (
                  <div className={styles.searchOpportunityResults}>
                    {matchingOpportunities.map((opportunity) => (
                      <article key={opportunity.id}>
                        <span>{opportunityTypeConfig[opportunity.type].label}</span>
                        <h3>{opportunity.title}</h3>
                        <p>{opportunity.organizer}</p>
                        <p>{opportunity.shortDescription || opportunity.description.slice(0, 180)}</p>
                        <Link
                          href={`/opportunities/${opportunity.id}?returnTo=${encodeURIComponent(`/opportunities/catalog?q=${encodeURIComponent(search)}`)}`}
                        >
                          Открыть возможность
                        </Link>
                      </article>
                    ))}
                    {matchingApplications.map((application) => (
                      <article key={application.publicId}>
                        <span>{opportunityTypeConfig[application.opportunity.type].label}</span>
                        <h3>Моя заявка: {application.opportunity.title}</h3>
                        <p>
                          Статус: {opportunityApplicationStatusLabels[application.status]}
                        </p>
                        {application.kind === "LATE_REQUEST" && <p>Индивидуальный запрос</p>}
                        <Link href={`/opportunities/applications#application-${application.publicId}`}>
                          Открыть заявку
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
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
                            document.formSchemaSnapshot,
                          )}
                        </h3>
                        <p>
                          Заявка {formatRequestNumber(document.requestId)}
                        </p>
                        <DateTimeStack value={document.updatedAt} />
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
        ) : activeTab === "portfolio" ? (
          <PortfolioView
            folders={portfolio.folders}
            items={portfolio.items}
            searchParams={{
              q: query.q,
              category: query.category,
              year: query.year,
              folder: query.folder,
            }}
          />
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
                      request.formSchemaSnapshot,
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
                          <DateTimeStack
                            className={styles.requestListDate}
                            value={request.createdAt}
                          />
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
  return (
    <Suspense fallback={<CampusLoading label="сервисы кампуса" />}>
      <HelpWorkspace searchParams={searchParams} />
    </Suspense>
  );
}

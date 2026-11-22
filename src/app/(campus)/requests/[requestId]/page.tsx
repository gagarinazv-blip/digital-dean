import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { RequestConversation } from "@/components/request-conversation";
import {
  StudentCancelForm,
  StudentReplyForm,
} from "@/app/(campus)/requests/request-forms";
import {
  cleanStudentFacingText,
  getStudentFacingGroupName,
  requestStatusLabels,
  requestTypeLabels,
} from "@/lib/campus-labels";
import {
  getRequestCatalogEntry,
  getRequestCatalogTitle,
  getRequestFieldEntries,
  getRequestProfileEntries,
} from "@/lib/request-catalog";
import { getStudentRequest } from "@/lib/student-request-data";
import { formatRequestNumber } from "@/lib/request-number";
import type { RequestStatus, RequestType } from "@/generated/prisma/enums";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "./request-detail.module.css";

export const instant = false;

const requestDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeZone: "Europe/Moscow",
});

const requestDateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
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

const requestStatusIcons: Record<RequestStatus, string> = {
  NEW: "✓",
  IN_PROGRESS: "◷",
  NEEDS_INFO: "!",
  READY: "✓",
  REJECTED: "×",
  CANCELLED: "×",
};

type StatusPresentation = {
  kicker: string;
  headline: string;
  description: string;
  tone: string;
};

function getPageTitle(status: RequestStatus, type: RequestType, serviceTitle: string) {
  if (status === "READY") {
    return type === "CERTIFICATE" ? "Справка готова" : "Заявка выполнена";
  }
  if (status === "REJECTED") {
    return type === "CERTIFICATE" ? "Заявка отклонена" : "Обращение отклонено";
  }
  if (status === "NEW") {
    return type === "CERTIFICATE" ? "Заявка отправлена" : "Обращение в деканат";
  }
  if (status === "CANCELLED") {
    return "Заявка отменена";
  }
  return serviceTitle;
}

function getStatusPresentation(
  status: RequestStatus,
  type: RequestType,
  hasResultDocument: boolean,
): StatusPresentation {
  switch (status) {
    case "NEW":
      if (type !== "CERTIFICATE") {
        return {
          kicker: "Статус: новая",
          headline: "Заявка зарегистрирована",
          description: "Ожидает назначения сотрудником деканата.",
          tone: styles.heroProgress,
        };
      }
      return {
        kicker: "Успешно отправлено",
        headline: "Всё готово! Заявка принята.",
        description: "Заявление зарегистрировано в системе деканата.",
        tone: styles.heroSuccess,
      };
    case "IN_PROGRESS":
      return {
        kicker: "Заявка в работе",
        headline: "Обращение рассматривает сотрудник",
        description: "История обработки и сообщения доступны на этой странице.",
        tone: styles.heroProgress,
      };
    case "NEEDS_INFO":
      return {
        kicker: "Требуется ваше действие",
        headline: "Нужны дополнительные сведения",
        description: "Уточните информацию, чтобы сотрудник мог продолжить работу.",
        tone: styles.heroAttention,
      };
    case "READY":
      return {
        kicker: "Документ готов",
        headline: type === "CERTIFICATE" ? "Справка подготовлена!" : "Заявка выполнена!",
        description: hasResultDocument
          ? "Сотрудник приложил результат — его можно скачать."
          : "Решение принято. Скачивание появится, когда сотрудник приложит результат.",
        tone: styles.heroSuccess,
      };
    case "REJECTED":
      return {
        kicker: "Требует исправления",
        headline:
          type === "CERTIFICATE"
            ? "Справку пока не удалось оформить"
            : "Нужны дополнительные сведения",
        description: "Ознакомьтесь с причиной и выберите, что сделать дальше.",
        tone: styles.heroRejected,
      };
    case "CANCELLED":
      return {
        kicker: "Заявка закрыта",
        headline: "Обработка заявки прекращена",
        description: "Заявка отменена и больше не обрабатывается.",
        tone: styles.heroCancelled,
      };
  }
}

export default async function StudentRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ created?: string; cancelled?: string }>;
}) {
  const [{ requestId }, query] = await Promise.all([params, searchParams]);
  const request = await getStudentRequest(requestId);
  const serviceTitle = getRequestCatalogTitle(
    request.catalogCode,
    requestTypeLabels[request.type],
  );
  const service = getRequestCatalogEntry(request.catalogCode);
  const requestNumber = formatRequestNumber(request.id);
  const resultAttachments = request.comments.flatMap((comment) =>
    comment.attachments.filter((attachment) => attachment.kind === "RESULT"),
  );
  const presentation = getStatusPresentation(
    request.status,
    request.type,
    resultAttachments.length > 0,
  );
  const title = getPageTitle(request.status, request.type, serviceTitle);
  const formEntries = getRequestFieldEntries(
    request.catalogCode,
    request.formFields,
  );
  const profileEntries = getRequestProfileEntries(request.profileSnapshot) ?? [];
  const latestStatusEntry =
    request.statusHistory[request.statusHistory.length - 1];
  const latestStaffMessage = request.comments
    .filter((message) => message.author.role === "STAFF")
    .at(-1);
  const statusComment =
    latestStatusEntry?.status === request.status
      ? latestStatusEntry.comment
      : null;
  const reason = statusComment || latestStaffMessage?.content;
  const historyForPanel = request.statusHistory;

  return (
    <CampusSection
      eyebrow="Документы и заявки"
      title={title}
      description={`${requestNumber} · ${serviceTitle}`}
    >
      <div className={styles.requestPage}>
        {query.created === "1" && (
          <p className={workflowStyles.success} role="status">
            Заявка успешно отправлена.
          </p>
        )}
        {query.cancelled === "1" && (
          <p className={workflowStyles.success} role="status">
            Заявка отменена.
          </p>
        )}

        <section
          aria-label={`Статус заявки: ${requestStatusLabels[request.status]}`}
          className={`${styles.statusHero} ${presentation.tone}`}
        >
          <span aria-hidden="true" className={styles.heroIcon}>
            {requestStatusIcons[request.status]}
          </span>
          <div className={styles.heroContent}>
            <p className={styles.heroKicker}>{presentation.kicker}</p>
            <h2>{presentation.headline}</h2>
            <p className={styles.heroDescription}>{presentation.description}</p>
            <div className={styles.heroMeta}>
              <span className={styles.demoBadge}>{requestNumber}</span>
              <span
                className={`${styles.heroStatus} ${requestStatusClasses[request.status]}`}
              >
                Статус: {requestStatusLabels[request.status].toLowerCase()}
              </span>
            </div>
          </div>
        </section>

        <div className={styles.requestGrid}>
          <section className={styles.panel} aria-labelledby="request-main-title">
            {request.status === "READY" ? (
              <>
                <h2 className={styles.panelTitle} id="request-main-title">
                  Результат заявки
                </h2>
                {resultAttachments.length > 0 ? (
                  <>
                    <ul className={styles.resultFiles}>
                      {resultAttachments.map((attachment) => (
                        <li key={attachment.id}>
                          <span aria-hidden="true" className={styles.fileIcon}>
                            ▤
                          </span>
                          <span className={styles.fileInfo}>
                            <strong title={attachment.fileName}>
                              {attachment.fileName}
                            </strong>
                            <span>
                              {Math.max(1, Math.ceil(attachment.sizeBytes / 1024))} КБ
                            </span>
                          </span>
                          <a
                            className={workflowStyles.button}
                            download
                            href={`/api/request-attachments/${attachment.id}`}
                          >
                            Скачать
                          </a>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.readyNotice}>
                      <span aria-hidden="true">✓</span>
                      Документ приложен сотрудником
                    </p>
                  </>
                ) : (
                  <p className={styles.cancelledNotice}>
                    Решение принято, но сотрудник ещё не приложил файл
                    результата. Ссылка для скачивания появится здесь после его
                    загрузки.
                  </p>
                )}
              </>
            ) : request.status === "REJECTED" ? (
              <>
                <h2 className={styles.panelTitle} id="request-main-title">
                  {request.type === "CERTIFICATE"
                    ? "Что произошло?"
                    : "Причина отказа"}
                </h2>
                <div className={styles.reasonCard}>
                  <span aria-hidden="true" className={styles.reasonIcon}>
                    !
                  </span>
                  <div>
                    <strong>Причина отказа</strong>
                    <p>
                      {reason ||
                        "Сотрудник не указал комментарий. Вы можете уточнить причину у деканата."}
                    </p>
                  </div>
                </div>
                <div className={styles.infoCard}>
                  <span aria-hidden="true">ⓘ</span>
                  <p>
                    Исправленную заявку можно подать повторно. Эта заявка и её
                    история останутся в списке.
                  </p>
                </div>
                <div className={styles.actions}>
                  <Link
                    className={workflowStyles.button}
                    href={`/requests/new?copy=${request.publicId}`}
                  >
                    Исправить и подать повторно
                  </Link>
                  <details className={styles.questionDisclosure}>
                    <summary className={workflowStyles.secondaryButton}>
                      Задать вопрос
                    </summary>
                    <StudentReplyForm
                      mode="question"
                      requestPublicId={request.publicId}
                    />
                  </details>
                </div>
              </>
            ) : request.status === "NEEDS_INFO" ? (
              <>
                <h2 className={styles.panelTitle} id="request-main-title">
                  Что нужно уточнить?
                </h2>
                <div className={styles.reasonCard}>
                  <span aria-hidden="true" className={styles.reasonIcon}>
                    !
                  </span>
                  <div>
                    <strong>Комментарий сотрудника</strong>
                    <p>
                      {reason || "Сотрудник попросил дополнить сведения заявки."}
                    </p>
                  </div>
                </div>
                <div className={styles.replyBlock}>
                  <p className={styles.sectionHint}>
                    Добавьте пояснение или приложите необходимые документы.
                  </p>
                  <StudentReplyForm
                    mode="reply"
                    requestPublicId={request.publicId}
                  />
                </div>
              </>
            ) : request.status === "NEW" ? (
              <>
                <h2 className={styles.panelTitle} id="request-main-title">
                  Информация о заявке
                </h2>
                <RequestMetadata
                  requestNumber={requestNumber}
                  request={request}
                  serviceTitle={serviceTitle}
                />
                {service && (
                  <p className={styles.deadlineHint}>
                    Ожидаемый срок: до {service.executionDays} рабочих дней
                  </p>
                )}
                <div className={styles.cancelBlock}>
                  <StudentCancelForm requestPublicId={request.publicId} />
                </div>
              </>
            ) : request.status === "IN_PROGRESS" ? (
              <>
                <h2 className={styles.panelTitle} id="request-main-title">
                  Сведения о заявке
                </h2>
                <RequestMetadata
                  requestNumber={requestNumber}
                  request={request}
                  serviceTitle={serviceTitle}
                />
                <details className={styles.questionDisclosure}>
                  <summary className={workflowStyles.secondaryButton}>
                    Задать вопрос сотруднику
                  </summary>
                  <StudentReplyForm
                    mode="question"
                    requestPublicId={request.publicId}
                  />
                </details>
              </>
            ) : (
              <>
                <h2 className={styles.panelTitle} id="request-main-title">
                  Информация о заявке
                </h2>
                <RequestMetadata
                  requestNumber={requestNumber}
                  request={request}
                  serviceTitle={serviceTitle}
                />
                <p className={styles.cancelledNotice}>
                  Отменённую заявку нельзя возобновить. При необходимости
                  создайте новую.
                </p>
              </>
            )}
          </section>

          {request.status === "NEW" && request.type === "CERTIFICATE" ? (
            <section className={styles.panel} aria-labelledby="next-steps-title">
              <h2 className={styles.panelTitle} id="next-steps-title">
                Что происходит дальше?
              </h2>
              <ol className={styles.processList}>
                <li className={styles.processDone}>
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>Заявка зарегистрирована</strong>
                    <p>Номер присвоен, заявка сохранена</p>
                  </div>
                </li>
                <li className={styles.processCurrent}>
                  <span aria-hidden="true">◷</span>
                  <div>
                    <strong>Проверка сотрудником</strong>
                    <p>Деканат проверит сведения</p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">▤</span>
                  <div>
                    <strong>Готовый документ</strong>
                    <p>Появится здесь после обработки</p>
                  </div>
                </li>
              </ol>
              <p className={styles.subtleNote}>
                О смене статуса придёт уведомление.
              </p>
            </section>
          ) : request.status === "REJECTED" &&
            request.type !== "CERTIFICATE" ? (
            <section className={styles.panel} aria-labelledby="request-summary-title">
              <h2 className={styles.panelTitle} id="request-summary-title">
                Сведения о заявке
              </h2>
              <RequestMetadata
                requestNumber={requestNumber}
                request={request}
                serviceTitle={serviceTitle}
              />
              <dl className={styles.metadataRows}>
                <div>
                  <dt>Заявитель</dt>
                  <dd>
                    {profileEntries.find((entry) => entry.label === "ФИО")
                      ?.value ?? "Не указано"}
                  </dd>
                </div>
                <div>
                  <dt>Статус</dt>
                  <dd>
                    <span
                      className={`${workflowStyles.statusBadge} ${requestStatusClasses[request.status]}`}
                    >
                      {requestStatusLabels[request.status]}
                    </span>
                  </dd>
                </div>
              </dl>
              <div className={styles.reasonCard}>
                <span aria-hidden="true" className={styles.reasonIcon}>
                  ×
                </span>
                <div>
                  <strong>Отклонено</strong>
                  <p>{reason || "Заявка отклонена сотрудником деканата."}</p>
                </div>
              </div>
            </section>
          ) : (
            <section className={styles.panel} aria-labelledby="history-title">
              <h2 className={styles.panelTitle} id="history-title">
                {request.status === "READY"
                  ? "Информация и история"
                  : request.status === "IN_PROGRESS"
                    ? "История обработки"
                    : request.status === "NEW"
                      ? "История обработки"
                    : "История заявки"}
              </h2>
              {request.status === "READY" && (
                <RequestMetadata
                  requestNumber={requestNumber}
                  request={request}
                  serviceTitle={serviceTitle}
                />
              )}
              {historyForPanel.length > 0 ? (
                <ol className={styles.timeline}>
                  {request.status !== "READY" && (
                    <li className={styles.timelineItem}>
                      <span
                        className={`${styles.timelineIcon} ${workflowStyles.statusNew}`}
                      >
                        ✓
                      </span>
                      <div className={styles.timelineContent}>
                        <strong>Заявка создана</strong>
                        <time dateTime={request.createdAt.toISOString()}>
                          {requestDateTimeFormatter.format(request.createdAt)}
                        </time>
                      </div>
                    </li>
                  )}
                  {historyForPanel.map((entry, index) => {
                    const author =
                      entry.author?.student?.fullName ??
                      entry.author?.staffProfile?.fullName ??
                      "Система";
                    return (
                      <li
                        className={styles.timelineItem}
                        key={`${entry.changedAt.toISOString()}-${index}`}
                      >
                        <span
                          className={`${styles.timelineIcon} ${requestStatusClasses[entry.status]}`}
                        >
                          {requestStatusIcons[entry.status]}
                        </span>
                        <div className={styles.timelineContent}>
                          <strong>
                            {entry.status === "READY"
                              ? "Заявка обработана"
                              : requestStatusLabels[entry.status]}
                          </strong>
                          <time dateTime={entry.changedAt.toISOString()}>
                            {requestDateTimeFormatter.format(entry.changedAt)}
                          </time>
                          <span>{author}</span>
                          {entry.comment && (
                            <p title={entry.comment}>{entry.comment}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className={styles.subtleNote}>История пока пуста.</p>
              )}
              {request.status === "READY" && (
                <p className={styles.readyNotice}>
                  <span aria-hidden="true">✓</span>
                  Заявка обработана
                </p>
              )}
            </section>
          )}
        </div>

        {(formEntries.length > 0 ||
          request.comment ||
          profileEntries.length > 0) && (
          <div className={styles.disclosures}>
            {(formEntries.length > 0 || request.comment) && (
              <details className={styles.disclosure}>
                <summary>Сведения из заявления</summary>
                {formEntries.length > 0 || request.comment ? (
                  <dl className={workflowStyles.detailList}>
                    {formEntries.map((entry) => (
                      <div key={entry.id}>
                        <dt>{entry.label}</dt>
                        <dd>{entry.value}</dd>
                      </div>
                    ))}
                    {request.comment && (
                      <div>
                        <dt>Дополнительное описание</dt>
                        <dd>{request.comment}</dd>
                      </div>
                    )}
                  </dl>
                ) : null}
              </details>
            )}
            {profileEntries.length > 0 && (
              <details className={styles.disclosure}>
                <summary>Данные профиля на момент подачи</summary>
                <dl className={workflowStyles.detailList}>
                  {profileEntries.map((entry) => (
                    <div key={entry.label}>
                      <dt>{entry.label}</dt>
                      <dd>
                        {entry.label === "Группа"
                          ? getStudentFacingGroupName(entry.value)
                          : cleanStudentFacingText(entry.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        )}

        {((request.status === "READY" &&
          request.statusHistory.length > 1) ||
          (request.status === "REJECTED" &&
            request.type !== "CERTIFICATE")) && (
          <details className={styles.disclosure}>
            <summary>Полная история статусов</summary>
            <ol className={styles.timeline}>
              {request.statusHistory.map((entry, index) => (
                <li
                  className={styles.timelineItem}
                  key={`${entry.changedAt.toISOString()}-full-${index}`}
                >
                  <span
                    className={`${styles.timelineIcon} ${requestStatusClasses[entry.status]}`}
                  >
                    {requestStatusIcons[entry.status]}
                  </span>
                  <div className={styles.timelineContent}>
                    <strong>{requestStatusLabels[entry.status]}</strong>
                    <time dateTime={entry.changedAt.toISOString()}>
                      {requestDateTimeFormatter.format(entry.changedAt)}
                    </time>
                    {entry.comment && <p>{entry.comment}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </details>
        )}

        {request.comments.length > 0 && (
          <details className={styles.disclosure}>
            <summary>Переписка · {request.comments.length}</summary>
            <RequestConversation messages={request.comments} />
          </details>
        )}

        <Link className={styles.backLink} href="/requests">
          ← Вернуться к списку заявок
        </Link>
      </div>
    </CampusSection>
  );
}

function RequestMetadata({
  requestNumber,
  request,
  serviceTitle,
}: {
  requestNumber: string;
  request: {
    createdAt: Date;
    updatedAt: Date;
  };
  serviceTitle: string;
}) {
  return (
    <dl className={styles.metadataRows}>
      <div>
        <dt>Номер</dt>
        <dd>{requestNumber}</dd>
      </div>
      <div>
        <dt>Услуга</dt>
        <dd>{serviceTitle}</dd>
      </div>
      <div>
        <dt>Дата отправки</dt>
        <dd>{requestDateFormatter.format(request.createdAt)}</dd>
      </div>
      {request.updatedAt.getTime() !== request.createdAt.getTime() && (
        <div>
          <dt>Последнее действие</dt>
          <dd>{requestDateTimeFormatter.format(request.updatedAt)}</dd>
        </div>
      )}
    </dl>
  );
}

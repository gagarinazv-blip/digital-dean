import Link from "next/link";
import { RequestFieldValue } from "@/components/request-field-value";
import { CampusSection } from "@/components/campus-section";
import { RequestConversation } from "@/components/request-conversation";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { canStaffRollbackRequest } from "@/lib/permissions";
import {
  formatDeliveryMethods,
  getRequestCatalogSnapshot,
  getRequestCatalogTitle,
  getRequestFieldEntries,
  getRequestProfileEntries,
  renderCertificateTemplate,
} from "@/lib/request-catalog";
import {
  getAllowedStaffRequestTransitions,
  getPreviousRequestStatus,
} from "@/lib/request-workflow";
import { formatStackDay } from "@/lib/date-stack";
import { getDemoNow } from "@/lib/demo-date";
import { getStaffRequestDetails } from "@/lib/staff-data";
import { formatRequestNumber } from "@/lib/request-number";
import { getUniversityDateTimeFormatter } from "@/lib/campus-time";
import {
  RequestAssignmentForm,
  RequestRollbackForm,
  RequestStatusForm,
  StaffCommentForm,
} from "@/app/staff/requests/request-forms";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "./request-detail.module.css";
import type { RequestStatus } from "@/generated/prisma/enums";

export const instant = false;

const requestDateFormatter = getUniversityDateTimeFormatter({
  dateStyle: "long",
  timeStyle: "short",
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

function getStudentInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("ru-RU");
}

function getStageIndex(status: RequestStatus): number {
  if (status === "NEW") {
    return 0;
  }
  if (status === "IN_PROGRESS" || status === "NEEDS_INFO") {
    return 1;
  }
  return 2;
}

function getReviewHeading(status: RequestStatus): string {
  switch (status) {
    case "NEW":
      return "Заявка ожидает назначения";
    case "IN_PROGRESS":
      return "Заявка на проверке";
    case "NEEDS_INFO":
      return "Ожидается ответ студента";
    case "READY":
      return "Заявка выполнена";
    case "REJECTED":
      return "Заявка отклонена";
    case "CANCELLED":
      return "Заявка отменена";
  }
}

function getReviewText(status: RequestStatus): string {
  switch (status) {
    case "NEW":
      return "Заявка ожидает назначения ответственному сотруднику.";
    case "IN_PROGRESS":
      return "Проверьте корректность данных и приложенных документов, затем примите решение.";
    case "NEEDS_INFO":
      return "Студенту отправлен запрос. Ответ и новые вложения появятся в переписке.";
    case "READY":
      return "Решение принято. Студент получит уведомление в личном кабинете.";
    case "REJECTED":
      return "Студент увидит причину отказа и сможет задать вопрос или подать заявку повторно.";
    case "CANCELLED":
      return "Студент отменил заявку. Дальнейшая обработка не требуется.";
  }
}

export default async function StaffRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const { request, staff, isManagerAccount, staffMembers } =
    await getStaffRequestDetails(requestId);
  const serviceTitle = getRequestCatalogTitle(
    request.catalogCode,
    requestTypeLabels[request.type],
    request.formSchemaSnapshot,
  );
  const requestAttachments = request.comments.flatMap(
    (comment) => comment.attachments,
  );
  const formEntries = getRequestFieldEntries(
    request.catalogCode,
    request.formFields,
    request.formSchemaSnapshot,
  );
  const profileEntries = getRequestProfileEntries(request.profileSnapshot) ?? [];
  const snapshot = getRequestCatalogSnapshot(request.formSchemaSnapshot);
  const certificateText = snapshot?.template
    ? renderCertificateTemplate(snapshot.template, {
        fullName: request.student.fullName,
        groupName: request.student.group.name,
        date: formatStackDay(getDemoNow(), null),
      })
    : null;
  const transitions = getAllowedStaffRequestTransitions(request.status);
  const stageIndex = getStageIndex(request.status);
  const assignedToMe = request.assignedToId === staff.id;
  const requestNumber = formatRequestNumber(request.id);
  const attachmentCount = request.comments.reduce(
    (count, comment) => count + comment.attachments.length,
    0,
  );
  const rollbackTargetStatus = getPreviousRequestStatus(
    request.statusHistory,
    request.status,
  );
  const canRollback =
    rollbackTargetStatus !== null &&
    canStaffRollbackRequest(staff, request);

  return (
    <CampusSection
      eyebrow={`Заявки / ${requestNumber}`}
      title={`Заявка ${requestNumber}`}
      description={`Проверка заявления студента на ${serviceTitle.toLowerCase()}.`}
    >
      <div className={styles.detailPage}>
        <div className={styles.stageRow}>
          <ol aria-label="Этапы обработки заявки" className={styles.stages}>
            {[
              { label: "Получена", description: "Заявка зарегистрирована" },
              {
                label:
                  request.status === "NEEDS_INFO"
                    ? "Уточнение"
                    : "Проверка",
                description:
                  request.status === "NEEDS_INFO"
                    ? "Ожидается ответ"
                    : "Текущий этап",
              },
              {
                label:
                  request.status === "REJECTED"
                    ? "Отклонена"
                    : request.status === "CANCELLED"
                      ? "Отменена"
                      : "Готово",
                description:
                  request.status === "READY"
                    ? "Решение принято"
                    : request.status === "REJECTED" ||
                        request.status === "CANCELLED"
                      ? "Обработка завершена"
                      : "Ожидает решения",
              },
            ].map((stage, index) => {
              const isComplete = index < stageIndex;
              const isCurrent = index === stageIndex;
              const isFailure =
                isCurrent &&
                (request.status === "REJECTED" ||
                  request.status === "CANCELLED");
              return (
                <li
                  aria-current={isCurrent ? "step" : undefined}
                  className={`${styles.stage} ${isComplete ? styles.stageComplete : ""} ${isCurrent ? styles.stageCurrent : ""} ${isFailure ? styles.stageFailure : ""}`}
                  key={stage.label}
                >
                  <span className={styles.stageMarker}>
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span className={styles.stageCopy}>
                    <strong>{stage.label}</strong>
                    <span>{stage.description}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.mainColumn}>
            <section className={`${styles.reviewBanner} ${styles[`review_${request.status}`]}`}>
              <span aria-hidden="true" className={styles.reviewIcon}>
                {request.status === "IN_PROGRESS"
                  ? "⌕"
                  : request.status === "READY"
                    ? "✓"
                    : request.status === "REJECTED" ||
                        request.status === "CANCELLED"
                      ? "×"
                      : request.status === "NEEDS_INFO"
                        ? "!"
                        : "▤"}
              </span>
              <div>
                <h2>{getReviewHeading(request.status)}</h2>
                <p>{getReviewText(request.status)}</p>
              </div>
            </section>

            <section className={styles.panel} aria-labelledby="request-info-title">
              <div className={styles.panelHeading}>
                <h2 id="request-info-title">Основная информация</h2>
                <span className={styles.demoBadge}>
                  {requestNumber}
                </span>
              </div>
              <dl className={styles.infoRows}>
                <div>
                  <dt><span aria-hidden="true">▤</span> Услуга</dt>
                  <dd>{serviceTitle}</dd>
                </div>
                {snapshot && (
                  <div>
                    <dt><span aria-hidden="true">◇</span> Условия</dt>
                    <dd>
                      {formatDeliveryMethods(snapshot.deliveryMethods)} · до{" "}
                      {snapshot.executionDays} рабочих дней · форма версии{" "}
                      {snapshot.version}
                      {snapshot.requiresApproval ? " · нужна подпись или согласование" : ""}
                    </dd>
                  </div>
                )}
                {formEntries.map((entry) => (
                  <div key={entry.id}>
                    <dt><span aria-hidden="true">◎</span> {entry.label}</dt>
                    <dd>
                          <RequestFieldValue
                            attachments={requestAttachments}
                            entry={entry}
                          />
                        </dd>
                  </div>
                ))}
                {request.comment && (
                  <div>
                    <dt><span aria-hidden="true">▧</span> Дополнительно</dt>
                    <dd>{request.comment}</dd>
                  </div>
                )}
                <div>
                  <dt><span aria-hidden="true">▦</span> Дата отправки</dt>
                  <dd>{requestDateFormatter.format(request.createdAt)}</dd>
                </div>
                {request.updatedAt.getTime() !== request.createdAt.getTime() && (
                  <div>
                    <dt><span aria-hidden="true">◷</span> Последнее действие</dt>
                    <dd>{requestDateFormatter.format(request.updatedAt)}</dd>
                  </div>
                )}
              </dl>

              {certificateText && (
                <div className={styles.studentSection}>
                  <h3>Текст справки по шаблону</h3>
                  <p className={styles.certificateText}>{certificateText}</p>
                </div>
              )}

              <div className={styles.studentSection}>
                <h3>Информация о студенте</h3>
                <div className={styles.studentCard}>
                  <span aria-hidden="true" className={styles.studentAvatar}>
                    {getStudentInitials(request.student.fullName)}
                  </span>
                  <dl className={styles.studentRows}>
                    <div>
                      <dt>Студент</dt>
                      <dd>{request.student.fullName}</dd>
                    </div>
                    <div>
                      <dt>Группа</dt>
                      <dd>{request.student.group.name}</dd>
                    </div>
                    <div>
                      <dt>Факультет</dt>
                      <dd>
                        {profileEntries.find((entry) => entry.label === "Факультет")
                          ?.value ?? staff.department}
                      </dd>
                    </div>
                    <div>
                      <dt>Курс</dt>
                      <dd>{request.student.course} курс</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {attachmentCount > 0 && (
                <div className={styles.attachmentsSection}>
                  <h3>
                    Приложенные документы
                    <span>{attachmentCount}</span>
                  </h3>
                  <ul className={styles.attachments}>
                    {request.comments.flatMap((comment) =>
                      comment.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          <span aria-hidden="true" className={styles.pdfIcon}>
                            PDF
                          </span>
                          <span className={styles.attachmentInfo}>
                            <strong title={attachment.fileName}>
                              {attachment.fileName}
                            </strong>
                            <span>{formatFileSize(attachment.sizeBytes)}</span>
                          </span>
                          <a
                            aria-label={`Скачать ${attachment.fileName}`}
                            className={styles.downloadLink}
                            download
                            href={`/api/request-attachments/${attachment.id}`}
                          >
                            ↓
                          </a>
                        </li>
                      )),
                    )}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.panel} aria-labelledby="assignee-title">
              <h2 className={styles.panelTitle} id="assignee-title">
                Ответственный
              </h2>
              <p className={styles.panelHint}>
                {request.assignedTo?.fullName ?? "Не назначен"}
              </p>
              {isManagerAccount && (
                <RequestAssignmentForm
                  assignedToId={request.assignedToId}
                  requestId={request.id}
                  staffMembers={staffMembers}
                />
              )}
            </section>

            <section className={styles.panel} aria-labelledby="decision-title">
              <h2 className={styles.panelTitle} id="decision-title">
                Решение по заявке
              </h2>
              {assignedToMe && transitions.length > 0 ? (
                <>
                  <p className={styles.panelHint}>
                    После принятия решения студент получит уведомление в личном
                    кабинете.
                  </p>
                  <RequestStatusForm
                    requestId={request.id}
                    transitions={transitions}
                  />
                </>
              ) : assignedToMe ? (
                <p className={styles.panelHint}>
                  Решение принято: {requestStatusLabels[request.status]}.
                  Повторно изменить статус нельзя.
                </p>
              ) : (
                <p className={styles.panelHint}>
                  Изменять статус заявки может только назначенный сотрудник.
                </p>
              )}
            </section>

            {canRollback && rollbackTargetStatus && (
              <section className={styles.panel} aria-labelledby="rollback-title">
                <h2 className={styles.panelTitle} id="rollback-title">
                  Откат статуса
                </h2>
                <p className={styles.panelHint}>
                  Вернуть «{requestStatusLabels[request.status]}» на
                  «{requestStatusLabels[rollbackTargetStatus]}».
                </p>
                <RequestRollbackForm
                  requestId={request.id}
                  targetStatus={rollbackTargetStatus}
                />
              </section>
            )}

            <section
              className={styles.panel}
              aria-labelledby="comments-title"
              id="request-events"
            >
              <div className={styles.panelHeading}>
                <h2 id="comments-title">Комментарии и история</h2>
                {request.statusHistory.length +
                  request.assignmentHistory.length +
                  request.comments.length >
                  0 && (
                  <a className={styles.eventsLink} href="#request-events">
                    Все события ↗
                  </a>
                )}
              </div>

              {request.comments.length > 0 ? (
                <div className={styles.comments}>
                  <RequestConversation
                    messages={request.comments}
                    hideAuthorNames
                    showVisibility
                  />
                </div>
              ) : (
                <p className={styles.panelHint}>Комментариев пока нет.</p>
              )}

              {request.statusHistory.length > 0 && (
                <ol className={styles.eventList}>
                  {request.statusHistory.map((entry, index) => {
                    const author =
                      entry.author?.staffProfile?.fullName ??
                      entry.author?.student?.fullName ??
                      "Система";
                    const isLatest = index === request.statusHistory.length - 1;
                    return (
                      <li className={styles.event} key={`${entry.changedAt.toISOString()}-${index}`}>
                        <span
                          className={`${styles.eventIcon} ${requestStatusClasses[entry.status]}`}
                        >
                          {requestStatusIcons[entry.status]}
                        </span>
                        <div className={styles.eventCopy}>
                          <strong>
                            {entry.fromStatus === null
                              ? `Начальный статус: ${requestStatusLabels[entry.status]}`
                              : `${requestStatusLabels[entry.fromStatus]} → ${requestStatusLabels[entry.status]}${entry.isRollback ? " · откат" : ""}`}
                          </strong>
                          <time dateTime={entry.changedAt.toISOString()}>
                            {requestDateFormatter.format(entry.changedAt)}
                          </time>
                          <span>
                            {isLatest &&
                            entry.status === "IN_PROGRESS" &&
                            !entry.isRollback
                              ? `Ответственный: ${author}`
                              : author}
                          </span>
                          {entry.comment && <p>{entry.comment}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {request.assignmentHistory.length > 0 && (
                <ol className={styles.eventList}>
                  {request.assignmentHistory.map((entry, index) => {
                    const author =
                      entry.changedBy?.staffProfile?.fullName ?? "Система";
                    return (
                      <li
                        className={styles.event}
                        key={`${entry.changedAt.toISOString()}-assignment-${index}`}
                      >
                        <span className={styles.assignmentEventIcon} aria-hidden="true">
                          ↔
                        </span>
                        <div className={styles.eventCopy}>
                          <strong>
                            Ответственный:{" "}
                            {entry.fromAssignedTo?.fullName ?? "Не назначен"} →{" "}
                            {entry.toAssignedTo?.fullName ?? "Не назначен"}
                          </strong>
                          <time dateTime={entry.changedAt.toISOString()}>
                            {requestDateFormatter.format(entry.changedAt)}
                          </time>
                          <span>{author}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {assignedToMe && (
                <div className={styles.commentForm}>
                  <StaffCommentForm
                    requestId={request.id}
                    requestStatus={request.status}
                  />
                </div>
              )}
            </section>
          </aside>
        </div>

        <Link className={styles.backLink} href="/staff/requests">
          ← Вернуться к списку заявок
        </Link>
      </div>
    </CampusSection>
  );
}

function formatFileSize(sizeBytes: number): string {
  return sizeBytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(sizeBytes / 1024))} КБ`
    : `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}

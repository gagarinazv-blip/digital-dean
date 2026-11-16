import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { RequestConversation } from "@/components/request-conversation";
import {
  StudentCancelForm,
  StudentReplyForm,
} from "@/app/(campus)/requests/request-forms";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import {
  getRequestCatalogTitle,
  getRequestFieldEntries,
  getRequestProfileEntries,
} from "@/lib/request-catalog";
import { getStudentRequest } from "@/lib/student-request-data";
import styles from "@/app/request-workflow.module.css";
import type { RequestStatus } from "@/generated/prisma/enums";

export const instant = false;

const requestDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

const requestStatusClasses: Record<RequestStatus, string> = {
  NEW: styles.statusNew,
  IN_PROGRESS: styles.statusInProgress,
  NEEDS_INFO: styles.statusNeedsInfo,
  READY: styles.statusReady,
  REJECTED: styles.statusRejected,
  CANCELLED: styles.statusCancelled,
};

export default async function StudentRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ created?: string; cancelled?: string }>;
}) {
  const [{ requestId }, query] = await Promise.all([params, searchParams]);
  const request = await getStudentRequest(requestId);
  const profileEntries = getRequestProfileEntries(request.profileSnapshot) ?? [];
  const formEntries = getRequestFieldEntries(
    request.catalogCode,
    request.formFields,
  );

  return (
    <CampusSection
      eyebrow="Мои заявки"
      title={getRequestCatalogTitle(
        request.catalogCode,
        requestTypeLabels[request.type],
      )}
      description={`Подана: ${requestDateFormatter.format(request.createdAt)}`}
    >
      <div className={styles.stack}>
        {query.created === "1" && (
          <p className={styles.success} role="status">
            Заявка успешно отправлена.
          </p>
        )}
        {query.cancelled === "1" && (
          <p className={styles.success} role="status">
            Заявка отменена.
          </p>
        )}
        <section className={styles.panel}>
          <span
            className={`${styles.statusBadge} ${requestStatusClasses[request.status]}`}
          >
            {requestStatusLabels[request.status]}
          </span>
          <div className={styles.metadata}>
            <p>Обновлена: {requestDateFormatter.format(request.updatedAt)}</p>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Данные заявки</h2>
          {formEntries.length > 0 || request.comment ? (
            <dl className={styles.detailList}>
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
          ) : (
            <p className={styles.hint}>
              Для этой заявки не сохранены дополнительные поля.
            </p>
          )}
        </section>

        <section className={styles.panel}>
          <h2>Данные профиля на момент подачи</h2>
          {profileEntries.length > 0 ? (
            <dl className={styles.detailList}>
              {profileEntries.map((entry) => (
                <div key={entry.label}>
                  <dt>{entry.label}</dt>
                  <dd>{entry.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.hint}>
              Снимок профиля для этой заявки недоступен.
            </p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="request-history-title">
          <h2 id="request-history-title">История статусов</h2>
          {request.statusHistory.length === 0 ? (
            <p className={styles.hint}>История пока пуста.</p>
          ) : (
            <ol className={styles.statusHistory}>
              {request.statusHistory.map((entry, index) => {
                const author =
                  entry.author?.student?.fullName ??
                  entry.author?.staffProfile?.fullName ??
                  "Система";
                return (
                  <li key={`${entry.changedAt.toISOString()}-${index}`}>
                    <span
                      className={`${styles.statusBadge} ${requestStatusClasses[entry.status]}`}
                    >
                      {requestStatusLabels[entry.status]}
                    </span>
                    <p>{requestDateFormatter.format(entry.changedAt)}</p>
                    <p>{author}</p>
                    {entry.comment && <p>{entry.comment}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="student-thread-title">
          <h2 id="student-thread-title">Сообщения</h2>
          <RequestConversation messages={request.comments} />
        </section>

        {request.status === "NEEDS_INFO" ? (
          <section className={styles.panel} aria-labelledby="student-reply-title">
            <h2 id="student-reply-title">Нужно добавить данные</h2>
            <p className={styles.hint}>
              Ответьте сотруднику или приложите документы. После отправки
              сотрудник проверит информацию и продолжит работу.
            </p>
            <StudentReplyForm requestPublicId={request.publicId} />
          </section>
        ) : request.status === "NEW" ? (
          <section className={styles.panel} aria-labelledby="student-cancel-title">
            <h2 id="student-cancel-title">Отмена заявки</h2>
            <p className={styles.hint}>
              Новую заявку можно отменить до начала её обработки.
            </p>
            <StudentCancelForm requestPublicId={request.publicId} />
          </section>
        ) : (
          <p className={styles.notice}>
            Если сотруднику понадобятся дополнительные сведения, он напишет
            здесь.
          </p>
        )}

        <Link className={styles.secondaryButton} href="/requests">
          Вернуться к списку заявок
        </Link>
      </div>
    </CampusSection>
  );
}

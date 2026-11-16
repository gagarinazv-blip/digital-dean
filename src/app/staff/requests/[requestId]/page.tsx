import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { RequestConversation } from "@/components/request-conversation";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import {
  getRequestCatalogTitle,
  getRequestFieldEntries,
  getRequestProfileEntries,
} from "@/lib/request-catalog";
import { getAllowedStaffRequestTransitions } from "@/lib/request-workflow";
import { getStaffRequestDetails } from "@/lib/staff-data";
import {
  RequestAssignmentForm,
  RequestStatusForm,
  StaffCommentForm,
} from "@/app/staff/requests/request-forms";
import workflowStyles from "@/app/request-workflow.module.css";

export const instant = false;

const requestDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

export default async function StaffRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const { request, staff } = await getStaffRequestDetails(requestId);
  const formEntries = getRequestFieldEntries(
    request.catalogCode,
    request.formFields,
  );
  const profileEntries = getRequestProfileEntries(request.profileSnapshot) ?? [];

  return (
    <CampusSection
      eyebrow="Кабинет сотрудника"
      title={getRequestCatalogTitle(
        request.catalogCode,
        requestTypeLabels[request.type],
      )}
      description={`Заявка №${request.id}`}
    >
      <div className={workflowStyles.stack}>
        <section className={workflowStyles.panel}>
          <span className={workflowStyles.statusBadge}>
            {requestStatusLabels[request.status]}
          </span>
          <div className={workflowStyles.metadata}>
            <p>
              Студент: {request.student.fullName}, группа{" "}
              {request.student.group.name}, {request.student.course} курс
            </p>
            <p>Создана: {requestDateFormatter.format(request.createdAt)}</p>
            <p>Обновлена: {requestDateFormatter.format(request.updatedAt)}</p>
            <p>
              {request.assignedToId === null
                ? "Заявка не назначена"
                : "Заявка назначена вам"}
            </p>
          </div>
        </section>

        <section className={workflowStyles.panel}>
          <h2>Данные заявки</h2>
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
          ) : (
            <p className={workflowStyles.hint}>
              Для этой заявки не сохранены дополнительные поля.
            </p>
          )}
        </section>

        <section className={workflowStyles.panel}>
          <h2>Снимок профиля на момент подачи</h2>
          {profileEntries.length > 0 ? (
            <dl className={workflowStyles.detailList}>
              {profileEntries.map((entry) => (
                <div key={entry.label}>
                  <dt>{entry.label}</dt>
                  <dd>{entry.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={workflowStyles.hint}>
              Снимок профиля для этой заявки недоступен.
            </p>
          )}
        </section>

        <section className={workflowStyles.panel}>
          <h2>История статусов</h2>
          <ol className={workflowStyles.statusHistory}>
            {request.statusHistory.map((entry, index) => {
              const author =
                entry.author?.student?.fullName ??
                entry.author?.staffProfile?.fullName ??
                "Система";
              return (
                <li key={`${entry.changedAt.toISOString()}-${index}`}>
                  <span className={workflowStyles.statusBadge}>
                    {requestStatusLabels[entry.status]}
                  </span>
                  <p>{requestDateFormatter.format(entry.changedAt)}</p>
                  <p>{author}</p>
                  {entry.comment && <p>{entry.comment}</p>}
                </li>
              );
            })}
          </ol>
        </section>

        <section className={workflowStyles.panel}>
          <h2>Назначение</h2>
          <RequestAssignmentForm
            assignedToId={request.assignedToId}
            requestId={request.id}
            staffId={staff.id}
          />
        </section>

        {request.assignedToId === staff.id && (
          <section className={workflowStyles.panel}>
            <h2>Статус</h2>
            <RequestStatusForm
              requestId={request.id}
              transitions={getAllowedStaffRequestTransitions(request.status)}
            />
          </section>
        )}

        <section className={workflowStyles.panel}>
          <h2>Переписка</h2>
          <RequestConversation
            messages={request.comments}
            hideAuthorNames
            showVisibility
          />
        </section>

        {request.assignedToId === staff.id && (
          <section className={workflowStyles.panel}>
            <h2>Добавить комментарий</h2>
            <StaffCommentForm requestId={request.id} />
          </section>
        )}

        <Link className={workflowStyles.secondaryButton} href="/staff">
          Вернуться к списку заявок
        </Link>
      </div>
    </CampusSection>
  );
}

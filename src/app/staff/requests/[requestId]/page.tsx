import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { RequestConversation } from "@/components/request-conversation";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import {
  getAllowedRequestTransitions,
} from "@/lib/request-workflow";
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

  return (
    <CampusSection
      eyebrow="Кабинет сотрудника"
      title={requestTypeLabels[request.type]}
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
          {request.comment && (
            <p className={workflowStyles.notice}>
              Служебная пометка: {request.comment}
            </p>
          )}
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
              transitions={getAllowedRequestTransitions(request.status)}
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

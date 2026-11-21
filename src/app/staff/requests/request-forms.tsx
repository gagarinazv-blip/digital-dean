"use client";

import { useActionState } from "react";
import type { RequestStatus } from "@/generated/prisma/enums";
import { requestStatusLabels } from "@/lib/campus-labels";
import type { RequestActionState } from "@/lib/request-action-state";
import {
  addStaffCommentAction,
  assignRequestAction,
  updateRequestStatusAction,
} from "@/app/staff/requests/actions";
import styles from "@/app/request-workflow.module.css";

const initialState: RequestActionState = {};

function ActionFeedback({ state }: { state: RequestActionState }) {
  return (
    <>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className={styles.success} aria-live="polite">
          {state.success}
        </p>
      )}
    </>
  );
}

export function RequestStatusForm({
  requestId,
  transitions,
}: {
  requestId: number;
  transitions: readonly RequestStatus[];
}) {
  const [state, formAction, pending] = useActionState(
    updateRequestStatusAction,
    initialState,
  );

  if (transitions.length === 0) {
    return (
      <p className={styles.hint}>
        Эта заявка уже завершена. Изменить её статус нельзя.
      </p>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <input name="requestId" type="hidden" value={requestId} />
      <div className={styles.field}>
        <label htmlFor={`request-status-message-${requestId}`}>
          Комментарий студенту
        </label>
        <textarea
          className={styles.textarea}
          id={`request-status-message-${requestId}`}
          maxLength={5000}
          name="content"
          placeholder="Укажите причину для уточнения или отказа"
        />
      </div>
      <ActionFeedback state={state} />
      <div className={styles.formActions}>
        {transitions.map((status) => {
          const buttonClass =
            status === "READY"
              ? styles.button
              : status === "REJECTED"
                ? styles.statusRejectButton
                : status === "NEEDS_INFO"
                  ? styles.statusClarifyButton
                  : styles.secondaryButton;
          const buttonLabel =
            status === "READY"
              ? "Готово"
              : status === "NEEDS_INFO"
                ? "Запросить уточнение"
                : status === "REJECTED"
                  ? "Отклонить"
                  : `Перевести: ${requestStatusLabels[status]}`;

          return (
            <button
              className={buttonClass}
              disabled={pending}
              key={status}
              name="status"
              type="submit"
              value={status}
            >
              {pending ? "Сохраняем…" : buttonLabel}
            </button>
          );
        })}
      </div>
    </form>
  );
}

export function StaffCommentForm({
  requestId,
  requestStatus,
}: {
  requestId: number;
  requestStatus: RequestStatus;
}) {
  const [state, formAction, pending] = useActionState(
    addStaffCommentAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <input name="requestId" type="hidden" value={requestId} />
      {requestStatus === "READY" ? (
        <>
          <input name="visibility" type="hidden" value="PUBLIC" />
          <p className={styles.hint}>
            Документ результата будет доступен студенту.
          </p>
        </>
      ) : (
        <div className={styles.field}>
          <label htmlFor={`comment-visibility-${requestId}`}>
            Кто увидит комментарий
          </label>
          <select
            className={styles.select}
            defaultValue="PUBLIC"
            id={`comment-visibility-${requestId}`}
            name="visibility"
          >
            <option value="PUBLIC">Студент и сотрудники</option>
            <option value="INTERNAL">Только сотрудники</option>
          </select>
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor={`staff-comment-${requestId}`}>Комментарий</label>
        <textarea
          className={styles.textarea}
          id={`staff-comment-${requestId}`}
          maxLength={5000}
          name="content"
          placeholder="Комментарий (необязательно, если прикреплён файл)"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor={`staff-comment-files-${requestId}`}>
          {requestStatus === "READY"
            ? "Прикрепить документ результата"
            : "Прикрепить файлы"}
        </label>
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className={styles.fileInput}
          id={`staff-comment-files-${requestId}`}
          multiple
          name="files"
          type="file"
        />
        <p className={styles.hint}>
          До 5 файлов PDF, JPEG или PNG, каждый не больше 5 МБ.
          {requestStatus === "READY" &&
            " Файл станет доступен студенту как результат заявки."}
        </p>
      </div>
      <ActionFeedback state={state} />
      <button className={styles.button} disabled={pending} type="submit">
        {pending ? "Отправляем…" : "Добавить комментарий"}
      </button>
    </form>
  );
}

export function RequestAssignmentForm({
  requestId,
  staffId,
  assignedToId,
}: {
  requestId: number;
  staffId: number;
  assignedToId: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    assignRequestAction,
    initialState,
  );

  if (assignedToId !== null) {
    return <p className={styles.hint}>Заявка назначена вам.</p>;
  }

  return (
    <form action={formAction} className={styles.form}>
      <input name="requestId" type="hidden" value={requestId} />
      <input name="assignedToId" type="hidden" value={staffId} />
      <p className={styles.hint}>
        Разрешённую свободную заявку можно взять только себе.
      </p>
      <ActionFeedback state={state} />
      <button className={styles.secondaryButton} disabled={pending} type="submit">
        {pending ? "Сохраняем…" : "Забрать заявку себе"}
      </button>
    </form>
  );
}

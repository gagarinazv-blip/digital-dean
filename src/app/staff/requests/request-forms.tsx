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
        <label htmlFor={`request-status-${requestId}`}>Новый статус</label>
        <select
          className={styles.select}
          defaultValue={transitions[0]}
          id={`request-status-${requestId}`}
          name="status"
          required
        >
          {transitions.map((status) => (
            <option key={status} value={status}>
              {requestStatusLabels[status]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor={`request-status-message-${requestId}`}>
          Сообщение студенту
        </label>
        <textarea
          className={styles.textarea}
          id={`request-status-message-${requestId}`}
          maxLength={5000}
          name="content"
          placeholder="Обязательно для статусов «Нужны данные» и «Отклонена»"
        />
      </div>
      <ActionFeedback state={state} />
      <button className={styles.button} disabled={pending} type="submit">
        {pending ? "Сохраняем…" : "Обновить статус"}
      </button>
    </form>
  );
}

export function StaffCommentForm({ requestId }: { requestId: number }) {
  const [state, formAction, pending] = useActionState(
    addStaffCommentAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <input name="requestId" type="hidden" value={requestId} />
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
      <div className={styles.field}>
        <label htmlFor={`staff-comment-${requestId}`}>Комментарий</label>
        <textarea
          className={styles.textarea}
          id={`staff-comment-${requestId}`}
          maxLength={5000}
          name="content"
          required
        />
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

"use client";

import { useActionState } from "react";
import { requestTypeLabels } from "@/lib/campus-labels";
import type { RequestActionState } from "@/lib/request-action-state";
import {
  createRequestAction,
  replyToRequestAction,
} from "@/app/(campus)/requests/actions";
import styles from "@/app/request-workflow.module.css";

const initialState: RequestActionState = {};
const fileAccept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

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

export function NewRequestForm() {
  const [state, formAction, pending] = useActionState(
    createRequestAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className={styles.form}
    >
      <div className={styles.field}>
        <label htmlFor="request-type">Вид заявки</label>
        <select
          className={styles.select}
          id="request-type"
          name="type"
          required
        >
          {Object.entries(requestTypeLabels).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="request-content">Опишите, что вам нужно</label>
        <textarea
          className={styles.textarea}
          id="request-content"
          maxLength={5000}
          name="content"
          placeholder="Например, для чего нужна справка"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="request-files">Документы (необязательно)</label>
        <input
          accept={fileAccept}
          className={styles.fileInput}
          id="request-files"
          multiple
          name="files"
          type="file"
        />
        <p className={styles.hint}>
          До 5 файлов за раз, каждый не больше 5 МБ. Поддерживаются PDF, JPEG и
          PNG.
        </p>
      </div>

      <ActionFeedback state={state} />
      <button className={styles.button} disabled={pending} type="submit">
        {pending ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}

export function StudentReplyForm({ requestId }: { requestId: number }) {
  const [state, formAction, pending] = useActionState(
    replyToRequestAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className={styles.form}
    >
      <input name="requestId" type="hidden" value={requestId} />
      <div className={styles.field}>
        <label htmlFor="student-reply">Ваш ответ</label>
        <textarea
          className={styles.textarea}
          id="student-reply"
          maxLength={5000}
          name="content"
          placeholder="Напишите ответ или пояснение"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="student-reply-files">Прикрепить документы</label>
        <input
          accept={fileAccept}
          className={styles.fileInput}
          id="student-reply-files"
          multiple
          name="files"
          type="file"
        />
        <p className={styles.hint}>
          До 5 файлов за раз, каждый не больше 5 МБ. Поддерживаются PDF, JPEG и
          PNG.
        </p>
      </div>
      <ActionFeedback state={state} />
      <button className={styles.button} disabled={pending} type="submit">
        {pending ? "Отправляем…" : "Отправить сотруднику"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import {
  getRequestProfileEntries,
  getRequestCatalogEntry,
  requestCatalog,
  type RequestCatalogCode,
  type RequestCatalogField,
  type RequestProfileSnapshot,
} from "@/lib/request-catalog";
import { validateRequestForm } from "@/lib/request-validation";
import type { RequestActionState } from "@/lib/request-action-state";
import {
  cancelRequestAction,
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

export function NewRequestForm({
  profile,
  publicId,
}: {
  profile: RequestProfileSnapshot;
  publicId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createRequestAction,
    initialState,
  );
  const [catalogCode, setCatalogCode] = useState<RequestCatalogCode>(
    requestCatalog[0].code,
  );
  const [fields, setFields] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [dismissedServerErrors, setDismissedServerErrors] = useState<
    Record<string, true>
  >({});
  const serverFieldErrors = state.fieldErrors ?? {};
  const service = getRequestCatalogEntry(catalogCode);
  const validation = validateRequestForm({
    catalogCode,
    fields,
    description,
  });

  const profileEntries = getRequestProfileEntries(profile) ?? [];

  function getFieldError(fieldId: string): string | undefined {
    return (
      (showValidation ? validation.errors[fieldId] : undefined) ??
      (dismissedServerErrors[fieldId] ? undefined : serverFieldErrors[fieldId])
    );
  }

  return (
    <form
      action={formAction}
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        setShowValidation(true);
        setDismissedServerErrors({});
        if (!validation.valid) {
          event.preventDefault();
        }
      }}
    >
      <input name="requestPublicId" type="hidden" value={publicId} />

      <section className={styles.profileSnapshot} aria-labelledby="request-profile-title">
        <h2 id="request-profile-title">Данные из вашего профиля</h2>
        <dl className={styles.profileGrid}>
          {profileEntries.map((entry) => (
            <div key={entry.label}>
              <dt>{entry.label}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.hint}>
          Эти данные будут сохранены в заявке и не редактируются в форме.
        </p>
      </section>

      <div className={styles.field}>
        <label htmlFor="request-type">Услуга</label>
        <select
          aria-describedby={
            getFieldError("catalogCode")
              ? "request-type-description request-type-error"
              : "request-type-description"
          }
          aria-invalid={Boolean(getFieldError("catalogCode"))}
          className={styles.select}
          id="request-type"
          name="catalogCode"
          onChange={(event) => {
            const nextService = getRequestCatalogEntry(
              event.currentTarget.value,
            );
            if (!nextService) {
              return;
            }
            setCatalogCode(nextService.code);
            setFields({});
            setDismissedServerErrors(
              Object.fromEntries(
                Object.keys(serverFieldErrors).map((fieldId) => [fieldId, true]),
              ),
            );
            setShowValidation(false);
          }}
          required
          value={catalogCode}
        >
          {requestCatalog
            .filter((entry) => entry.active)
            .map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.title}
              </option>
            ))}
        </select>
        <p className={styles.hint} id="request-type-description">
          {service?.description} Срок исполнения: обычно {service?.executionDays}{" "}
          рабочих дней.
        </p>
        {getFieldError("catalogCode") && (
          <p className={styles.error} id="request-type-error" role="alert">
            {getFieldError("catalogCode")}
          </p>
        )}
      </div>

      {service?.fields.map((field) => (
        <RequestCatalogFieldInput
          error={getFieldError(field.id)}
          field={field}
          key={field.id}
          onBlur={() => setShowValidation(true)}
          onChange={(value) => {
            setFields((current) => ({ ...current, [field.id]: value }));
            setDismissedServerErrors((current) => ({
              ...current,
              [field.id]: true,
            }));
          }}
          value={fields[field.id] ?? ""}
        />
      ))}

      <div className={styles.field}>
        <label htmlFor="request-content">Дополнительное описание</label>
        <textarea
          aria-describedby={
            getFieldError("description")
              ? "request-content-hint request-content-error"
              : "request-content-hint"
          }
          aria-invalid={Boolean(getFieldError("description"))}
          className={styles.textarea}
          id="request-content"
          maxLength={1000}
          name="description"
          onBlur={() => setShowValidation(true)}
          onChange={(event) => {
            setDescription(event.currentTarget.value);
            setDismissedServerErrors((current) => ({
              ...current,
              description: true,
            }));
          }}
          placeholder="Необязательно"
          value={description}
        />
        <p className={styles.hint} id="request-content-hint">
          До 1000 символов.
        </p>
        {getFieldError("description") && (
          <p className={styles.error} id="request-content-error" role="alert">
            {getFieldError("description")}
          </p>
        )}
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

function RequestCatalogFieldInput({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: RequestCatalogField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const inputId = `request-field-${field.id}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = error ? `${hintId} ${errorId}` : hintId;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>{field.label}</label>
      {field.kind === "select" ? (
        <select
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={styles.select}
          id={inputId}
          name={`field.${field.id}`}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
          required={field.required}
          value={value}
        >
          <option value="">Выберите значение</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={error ? styles.invalidInput : styles.input}
          id={inputId}
          maxLength={field.kind === "text" ? field.maxLength : undefined}
          name={`field.${field.id}`}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
          required={field.required}
          type={field.kind === "date" ? "date" : "text"}
          value={value}
        />
      )}
      <p className={styles.hint} id={hintId}>
        {field.kind === "text" && field.maxLength
          ? `До ${field.maxLength} символов.`
          : "Обязательное поле."}
      </p>
      {error && (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function StudentReplyForm({
  requestPublicId,
}: {
  requestPublicId: string;
}) {
  const [state, formAction, pending] = useActionState(
    replyToRequestAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className={styles.form}
    >
      <input name="requestPublicId" type="hidden" value={requestPublicId} />
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

export function StudentCancelForm({
  requestPublicId,
}: {
  requestPublicId: string;
}) {
  const [state, formAction, pending] = useActionState(
    cancelRequestAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <input name="requestPublicId" type="hidden" value={requestPublicId} />
      <ActionFeedback state={state} />
      <button className={styles.secondaryButton} disabled={pending} type="submit">
        {pending ? "Отменяем…" : "Отменить заявку"}
      </button>
    </form>
  );
}

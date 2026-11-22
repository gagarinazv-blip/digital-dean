"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import type {
  EventActionState,
  EventFormField,
} from "@/lib/event-validation";
import {
  eventStatusLabels,
  eventStatusValues,
  eventTypeLabels,
  eventTypeValues,
} from "@/lib/event-constants";
import { formatMoscowTime, getMoscowDateKey } from "@/lib/campus-time";
import type { EventStatus } from "@/generated/prisma/enums";
import type { EventRecord } from "@/lib/event-data";
import { deleteEventAction } from "./actions";
import styles from "./events.module.css";

type EventAction = (
  previousState: EventActionState,
  formData: FormData,
) => Promise<EventActionState>;

const initialState: EventActionState = {};

export function EventForm({
  action,
  event,
  submitLabel,
}: {
  action: EventAction;
  event?: EventRecord;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const id = useId();

  function fieldId(field: EventFormField) {
    return `${id}-${field}`;
  }

  function describedBy(field: EventFormField) {
    return state.fieldErrors?.[field] ? `${fieldId(field)}-error` : undefined;
  }

  function errorFor(field: EventFormField) {
    const error = state.fieldErrors?.[field];
    return error ? (
      <span className={styles.fieldError} id={`${fieldId(field)}-error`}>
        {error}
      </span>
    ) : null;
  }

  const statusValue: EventStatus = event?.status ?? "DRAFT";

  return (
    <form action={formAction} className={styles.form}>
      {event ? <input name="eventId" type="hidden" value={event.id} /> : null}
      <label className={styles.field} htmlFor={fieldId("title")}>
        Название
        <input
          aria-describedby={describedBy("title")}
          aria-invalid={Boolean(state.fieldErrors?.title)}
          autoComplete="off"
          defaultValue={event?.title ?? ""}
          id={fieldId("title")}
          maxLength={120}
          name="title"
          required
        />
        {errorFor("title")}
      </label>

      <div className={styles.formGrid}>
        <label className={styles.field} htmlFor={fieldId("type")}>
          Тип события
          <select
            aria-describedby={describedBy("type")}
            aria-invalid={Boolean(state.fieldErrors?.type)}
            defaultValue={event?.type ?? "OTHER"}
            id={fieldId("type")}
            name="type"
            required
          >
            {eventTypeValues.map((type) => (
              <option key={type} value={type}>
                {eventTypeLabels[type]}
              </option>
            ))}
          </select>
          {errorFor("type")}
        </label>
        <label className={styles.field} htmlFor={fieldId("status")}>
          Статус
          <select
            aria-describedby={describedBy("status")}
            aria-invalid={Boolean(state.fieldErrors?.status)}
            defaultValue={statusValue}
            id={fieldId("status")}
            name="status"
            required
          >
            {eventStatusValues.map((status) => (
              <option key={status} value={status}>
                {eventStatusLabels[status]}
              </option>
            ))}
          </select>
          {errorFor("status")}
        </label>
      </div>

      <label className={styles.field} htmlFor={fieldId("description")}>
        Описание
        <textarea
          aria-describedby={describedBy("description")}
          aria-invalid={Boolean(state.fieldErrors?.description)}
          defaultValue={event?.description ?? ""}
          id={fieldId("description")}
          maxLength={1000}
          name="description"
          rows={4}
        />
        {errorFor("description")}
      </label>

      <div className={styles.formGrid}>
        <label className={styles.field} htmlFor={fieldId("date")}>
          Дата
          <input
            aria-describedby={describedBy("date")}
            aria-invalid={Boolean(state.fieldErrors?.date)}
            defaultValue={
              event ? getMoscowDateKey(event.startsAt) : ""
            }
            id={fieldId("date")}
            name="date"
            required
            type="date"
          />
          {errorFor("date")}
        </label>
        <label className={styles.field} htmlFor={fieldId("startsAt")}>
          Время начала
          <input
            aria-describedby={describedBy("startsAt")}
            aria-invalid={Boolean(state.fieldErrors?.startsAt)}
            defaultValue={event ? formatMoscowTime(event.startsAt) : ""}
            id={fieldId("startsAt")}
            name="startsAt"
            required
            type="time"
          />
          {errorFor("startsAt")}
        </label>
        <label className={styles.field} htmlFor={fieldId("endsAt")}>
          Время окончания
          <input
            aria-describedby={describedBy("endsAt")}
            aria-invalid={Boolean(state.fieldErrors?.endsAt)}
            defaultValue={event ? formatMoscowTime(event.endsAt) : ""}
            id={fieldId("endsAt")}
            name="endsAt"
            required
            type="time"
          />
          <span className={styles.hint}>
            Если событие заканчивается после полуночи, укажите более раннее время.
          </span>
          {errorFor("endsAt")}
        </label>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field} htmlFor={fieldId("location")}>
          Аудитория
          <input
            aria-describedby={describedBy("location")}
            aria-invalid={Boolean(state.fieldErrors?.location)}
            defaultValue={event?.location ?? ""}
            id={fieldId("location")}
            maxLength={160}
            name="location"
            required
          />
          {errorFor("location")}
        </label>
        <label className={styles.field} htmlFor={fieldId("host")}>
          Кто проводит
          <input
            aria-describedby={describedBy("host")}
            aria-invalid={Boolean(state.fieldErrors?.host)}
            defaultValue={event?.host ?? ""}
            id={fieldId("host")}
            maxLength={160}
            name="host"
            required
          />
          {errorFor("host")}
        </label>
      </div>

      <label className={styles.field} htmlFor={fieldId("registrationUrl")}>
        Ссылка на регистрацию
        <input
          aria-describedby={describedBy("registrationUrl")}
          aria-invalid={Boolean(state.fieldErrors?.registrationUrl)}
          defaultValue={event?.registrationUrl ?? ""}
          id={fieldId("registrationUrl")}
          maxLength={2048}
          name="registrationUrl"
          placeholder="https://example.com/register/1"
          type="url"
        />
        {errorFor("registrationUrl")}
      </label>

      {state.error ? (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className={styles.formSuccess} aria-live="polite">
          {state.success}
        </p>
      ) : null}
      <button className={styles.primaryButton} disabled={pending} type="submit">
        {pending ? "Сохраняем…" : submitLabel}
      </button>
    </form>
  );
}

export function EventDeleteDialog({
  eventId,
  title,
}: {
  eventId: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ConfirmationDialog
      buttonClassName={styles.dangerButton}
      buttonLabel="Удалить"
      onOpenChange={setOpen}
      open={open}
      title="Удалить событие?"
    >
      <p className={styles.hint}>
        Событие «{title}» будет удалено без возможности восстановления.
      </p>
      <form action={deleteEventAction} className={styles.formActions}>
        <input name="eventId" type="hidden" value={eventId} />
        <button
          className={styles.secondaryButton}
          onClick={() => setOpen(false)}
          type="button"
        >
          Отмена
        </button>
        <button className={styles.dangerButton} type="submit">
          Удалить событие
        </button>
      </form>
    </ConfirmationDialog>
  );
}

export function CopyEventButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.secondaryButton} disabled={pending} type="submit">
      {pending ? "Копируем…" : "Скопировать на следующую неделю"}
    </button>
  );
}

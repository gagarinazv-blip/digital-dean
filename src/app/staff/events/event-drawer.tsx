"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Drawer } from "@/components/ui/drawer";
import { FormField } from "@/components/ui/form-field";
import controls from "@/components/ui/controls.module.css";
import { formatMoscowTime } from "@/lib/campus-time";
import {
  approvalItemLabels,
  approvalItems,
  approvalStatuses,
  getApprovalStatusLabel,
} from "@/lib/event-approvals";
import { eventTypeLabels, eventTypeValues } from "@/lib/event-constants";
import type { EventRecord } from "@/lib/event-data";
import type { EventActionState } from "@/lib/event-validation";
import { createEventAction, updateEventAction } from "./actions";
import styles from "./events.module.css";

type EventDrawerProps = {
  open: boolean;
  event?: EventRecord;
  /** День, на который добавляют новое событие. */
  dateKey: string;
  onClose: () => void;
  onSaved: (message: string) => void;
};

// Состояние формы создаётся заново при каждом открытии.
export function EventDrawer(props: EventDrawerProps) {
  const [session, setSession] = useState({ open: props.open, id: 0 });
  if (session.open !== props.open) {
    setSession({
      open: props.open,
      id: props.open ? session.id + 1 : session.id,
    });
  }
  return <EventEditor {...props} key={session.id} />;
}

function EventEditor({ open, event, dateKey, onClose, onSaved }: EventDrawerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<EventActionState>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const errors = state.fieldErrors ?? {};

  function submit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (isPending) return;
    const formData = new FormData(submitEvent.currentTarget);
    startTransition(async () => {
      const result = await (event ? updateEventAction : createEventAction)(
        {},
        formData,
      ).catch((): EventActionState => ({
        error: "Не удалось связаться с сервером. Попробуйте ещё раз.",
      }));
      setState(result);
      if (result.success) {
        setIsDirty(false);
        onSaved(result.success);
      } else {
        // Первое поле с ошибкой появляется после отрисовки.
        window.setTimeout(() => {
          formRef.current
            ?.querySelector<HTMLElement>("[aria-invalid=true], [role=alert]")
            ?.focus();
        });
      }
    });
  }

  return (
    <Drawer
      description={
        event?.status === "PUBLISHED"
          ? "Если изменить спикера, аудиторию или время, событие вернётся в черновики."
          : "Сохранится как черновик. Студенты увидят событие после публикации."
      }
      eyebrow={event ? "Событие" : "Новое событие"}
      footer={(requestClose) => (
        <>
          <button
            className={controls.secondary}
            disabled={isPending}
            onClick={requestClose}
            type="button"
          >
            Отмена
          </button>
          <button
            aria-busy={isPending}
            className={controls.primary}
            disabled={isPending}
            form="digest-event-form"
            type="submit"
          >
            {isPending ? "Сохраняем…" : event ? "Сохранить" : "Сохранить черновик"}
          </button>
        </>
      )}
      isBusy={isPending}
      isDirty={isDirty}
      onClose={onClose}
      open={open}
      title={event?.title ?? "Событие дайджеста"}
    >
      <form
        className={styles.form}
        id="digest-event-form"
        noValidate
        onChange={() => setIsDirty(true)}
        onSubmit={submit}
        ref={formRef}
      >
        {event ? <input name="eventId" type="hidden" value={event.id} /> : null}
        <input name="status" type="hidden" value={event?.status ?? "DRAFT"} />
        {state.error ? (
          <p className={controls.alert} role="alert" tabIndex={-1}>
            {state.error}
          </p>
        ) : null}

        <FormField error={errors.title} label="Название" required>
          {(control) => (
            <input
              {...control}
              autoComplete="off"
              defaultValue={event?.title ?? ""}
              maxLength={120}
              name="title"
            />
          )}
        </FormField>
        <div className={styles.formGrid}>
          <FormField error={errors.type} label="Тип события" required>
            {(control) => (
              <select {...control} defaultValue={event?.type ?? "SPEAKER_MEETING"} name="type">
                {eventTypeValues.map((type) => (
                  <option key={type} value={type}>
                    {eventTypeLabels[type]}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField error={errors.date} label="Дата" required>
            {(control) => (
              <input
                {...control}
                defaultValue={event ? event.eventDate.toISOString().slice(0, 10) : dateKey}
                name="date"
                type="date"
              />
            )}
          </FormField>
        </div>
        <FormField error={errors.description} label="Описание">
          {(control) => (
            <textarea
              {...control}
              defaultValue={event?.description ?? ""}
              maxLength={1000}
              name="description"
              rows={4}
            />
          )}
        </FormField>

        <fieldset className={styles.fieldset}>
          <legend>Время, аудитория и спикер</legend>
          <p className={controls.hint}>
            Если что-то ещё неизвестно, оставьте поле пустым и выберите статус.
          </p>
          {approvalItems.map((item) => {
            const approval = event?.approvals[item];
            return (
              <div className={styles.approvalField} key={item}>
                {item === "SPEAKER" ? (
                  <FormField error={errors.host} label="Спикер или ведущий">
                    {(control) => (
                      <input
                        {...control}
                        defaultValue={event?.host ?? ""}
                        maxLength={160}
                        name="host"
                      />
                    )}
                  </FormField>
                ) : item === "ROOM" ? (
                  <FormField error={errors.location} label="Аудитория">
                    {(control) => (
                      <input
                        {...control}
                        defaultValue={event?.location ?? ""}
                        maxLength={160}
                        name="location"
                      />
                    )}
                  </FormField>
                ) : (
                  <div className={styles.timeFields}>
                    <FormField error={errors.startsAt} label="Начало">
                      {(control) => (
                        <input
                          {...control}
                          defaultValue={event?.startsAt ? formatMoscowTime(event.startsAt) : ""}
                          name="startsAt"
                          type="time"
                        />
                      )}
                    </FormField>
                    <FormField error={errors.endsAt} label="Окончание">
                      {(control) => (
                        <input
                          {...control}
                          defaultValue={event?.endsAt ? formatMoscowTime(event.endsAt) : ""}
                          name="endsAt"
                          type="time"
                        />
                      )}
                    </FormField>
                  </div>
                )}
                <FormField label={`${approvalItemLabels[item]}: статус`}>
                  {(control) => (
                    <select
                      {...control}
                      defaultValue={approval?.status ?? "NOT_APPROVED"}
                      name={`approval${item}`}
                    >
                      {approvalStatuses.map((status) => (
                        <option key={status} value={status}>
                          {getApprovalStatusLabel(item, status)}
                        </option>
                      ))}
                      {approval?.status === "NOT_REQUIRED" ? (
                        <option value="NOT_REQUIRED">
                          {getApprovalStatusLabel(item, "NOT_REQUIRED")}
                        </option>
                      ) : null}
                    </select>
                  )}
                </FormField>
                <FormField label="Примечание для коллег">
                  {(control) => (
                    <input
                      {...control}
                      defaultValue={approval?.note ?? ""}
                      maxLength={200}
                      name={`note${item}`}
                      placeholder={
                        item === "SPEAKER"
                          ? "Ждём ответ до среды"
                          : item === "ROOM"
                            ? "Заявка на зал отправлена"
                            : "Зависит от расписания зала"
                      }
                    />
                  )}
                </FormField>
              </div>
            );
          })}
          <p className={controls.hint}>
            Если событие заканчивается после полуночи, укажите более раннее время.
          </p>
        </fieldset>

        <FormField
          error={errors.registrationUrl}
          hint="Без ссылки студенты увидят «Вход свободный»."
          label="Ссылка на регистрацию"
        >
          {(control) => (
            <input
              {...control}
              defaultValue={event?.registrationUrl ?? ""}
              maxLength={2048}
              name="registrationUrl"
              placeholder="https://"
              type="url"
            />
          )}
        </FormField>
      </form>
    </Drawer>
  );
}

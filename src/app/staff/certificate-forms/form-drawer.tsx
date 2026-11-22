"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DateTimeStack } from "@/components/date-time-stack";
import { useDemoNow } from "@/components/demo-now";
import { Drawer } from "@/components/ui/drawer";
import { FieldError, FormField } from "@/components/ui/form-field";
import controls from "@/components/ui/controls.module.css";
import { formatStackDay } from "@/lib/date-stack";
import {
  CERTIFICATE_DESCRIPTION_LIMIT,
  CERTIFICATE_TEMPLATE_LIMIT,
  CERTIFICATE_TITLE_LIMIT,
  validateCertificateFormInput,
  type CertificateFormErrors,
} from "@/lib/certificate-form-validation";
import type { ManagedCertificateForm } from "@/lib/certificate-forms";
import {
  certificateDeliveryLabels,
  type CertificateDelivery,
} from "@/lib/request-catalog";
import {
  createCertificateFormAction,
  updateCertificateFormAction,
} from "./actions";
import {
  createDraftField,
  FieldBuilder,
  toDraftField,
  toFieldInput,
} from "./field-builder";
import { FormPreview, type CertificateFormDraft } from "./form-preview";
import styles from "./certificate-forms.module.css";

const deliveryMethods = Object.keys(
  certificateDeliveryLabels,
) as CertificateDelivery[];

const auditActionLabels: Record<
  ManagedCertificateForm["history"][number]["action"],
  string
> = {
  CREATED: "Создан",
  UPDATED: "Изменён",
  DUPLICATED: "Создан как копия",
  ACTIVATED: "Опубликован",
  ARCHIVED: "Перенесён в архив",
};

const changedFieldLabels: Record<string, string> = {
  title: "название",
  description: "описание",
  executionDays: "срок",
  deliveryMethods: "способ получения",
  requiresApproval: "согласование",
  template: "шаблон",
  fields: "поля заявки",
  status: "статус",
};

function createDraft(form?: ManagedCertificateForm): CertificateFormDraft {
  return {
    title: form?.title ?? "",
    description: form?.description ?? "",
    executionDays: form ? String(form.executionDays) : "5",
    deliveryMethods: form?.deliveryMethods ?? ["ELECTRONIC"],
    requiresApproval: form?.requiresApproval ?? false,
    template: form?.template ?? "",
    fields: form ? form.fields.map(toDraftField) : [createDraftField(new Set())],
  };
}

function toInput(draft: CertificateFormDraft) {
  return {
    title: draft.title,
    description: draft.description,
    executionDays: /^\d+$/.test(draft.executionDays.trim())
      ? Number(draft.executionDays)
      : null,
    deliveryMethods: draft.deliveryMethods,
    requiresApproval: draft.requiresApproval,
    template: draft.template,
    fields: draft.fields.map(toFieldInput),
  };
}

type EditorProps = {
  form?: ManagedCertificateForm;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

// Состояние создаётся заново для каждой формы и версии через key.
export function CertificateFormDrawer(props: EditorProps) {
  const [session, setSession] = useState({ open: props.open, id: 0 });
  if (session.open !== props.open) {
    setSession({
      open: props.open,
      id: props.open ? session.id + 1 : session.id,
    });
  }
  return <CertificateFormEditor {...props} key={session.id} />;
}

function CertificateFormEditor({ form, open, onClose, onSaved }: EditorProps) {
  const router = useRouter();
  const now = useDemoNow();
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmittingRef = useRef(false);
  const [draft, setDraft] = useState(() => createDraft(form));
  const [initialInput] = useState(() => JSON.stringify(toInput(draft)));
  const [errors, setErrors] = useState<CertificateFormErrors>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [tab, setTab] = useState<"settings" | "preview">("settings");
  const isDirty = JSON.stringify(toInput(draft)) !== initialInput;

  function update(patch: Partial<CertificateFormDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    // Исправленные ошибки исчезают сразу, новые появятся при сохранении.
    if (Object.keys(errors).length > 0) {
      const validated = validateCertificateFormInput(toInput(next));
      const remaining = validated.valid ? {} : validated.errors;
      setErrors((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([key]) => key in remaining),
        ),
      );
    }
  }

  useEffect(() => {
    if (!open || pending || !error) return;
    const container = formRef.current;
    const target =
      container?.querySelector<HTMLElement>("[aria-invalid=true]") ??
      container?.querySelector<HTMLElement>("[role=alert]");
    target?.focus();
    target?.scrollIntoView({ block: "center" });
  }, [error, open, pending]);

  function fail(message: string, fieldErrors: CertificateFormErrors = {}) {
    setTab("settings");
    setErrors(fieldErrors);
    setError(message);
  }

  async function save(publish: boolean) {
    if (isSubmittingRef.current) return;
    const input = toInput(draft);
    const validated = validateCertificateFormInput(input);
    setError("");
    if (!validated.valid) {
      // Новая строка ошибки, даже если текст тот же: фокус вернётся к полю.
      window.setTimeout(() => fail("Проверьте выделенные поля.", validated.errors));
      return;
    }

    isSubmittingRef.current = true;
    setErrors({});
    setPending(publish ? "publish" : "draft");
    try {
      const result = form
        ? await updateCertificateFormAction(form.code, form.version, input)
        : await createCertificateFormAction(input, publish);
      if (!result.ok) {
        fail(result.error, result.fieldErrors);
        return;
      }
      onSaved(result.message);
      onClose();
      router.refresh();
    } catch {
      fail(
        "Не удалось связаться с сервером. Данные в форме сохранены — попробуйте ещё раз.",
      );
    } finally {
      isSubmittingRef.current = false;
      setPending(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter в поле новой формы не публикует её: для этого есть кнопка.
    if (form) void save(false);
  }

  function toggleDelivery(method: CertificateDelivery, checked: boolean) {
    update({
      deliveryMethods: deliveryMethods.filter((item) =>
        item === method ? checked : draft.deliveryMethods.includes(item),
      ),
    });
  }

  return (
    <Drawer
      description={
        form
          ? `Версия ${form.version}. Поданные заявки сохраняют ту схему, с которой отправлены.`
          : "Студенты увидят форму после публикации."
      }
      eyebrow="Виды справок"
      footer={(requestClose) => (
        <>
          <button
            className={controls.secondary}
            disabled={pending !== null}
            onClick={requestClose}
            type="button"
          >
            Отмена
          </button>
          {form ? null : (
            <button
              aria-busy={pending === "draft"}
              className={controls.secondary}
              disabled={pending !== null}
              onClick={() => void save(false)}
              type="button"
            >
              {pending === "draft" ? "Сохраняется…" : "Сохранить черновик"}
            </button>
          )}
          <button
            aria-busy={form ? pending !== null : pending === "publish"}
            className={controls.primary}
            disabled={pending !== null}
            onClick={() => void save(!form)}
            type="button"
          >
            {form
              ? pending
                ? "Сохраняется…"
                : "Сохранить"
              : pending === "publish"
                ? "Публикуется…"
                : "Опубликовать"}
          </button>
        </>
      )}
      isBusy={pending !== null}
      isDirty={isDirty}
      onClose={onClose}
      open={open}
      title={form ? form.title : "Новый вид справки"}
    >
      <div aria-label="Режим формы" className={styles.tabs} role="group">
        <button
          aria-pressed={tab === "settings"}
          className={styles.tab}
          onClick={() => setTab("settings")}
          type="button"
        >
          Настройка
        </button>
        <button
          aria-pressed={tab === "preview"}
          className={styles.tab}
          onClick={() => setTab("preview")}
          type="button"
        >
          Как увидит студент
        </button>
      </div>
      {tab === "preview" ? (
        <FormPreview
          draft={draft}
          today={now ? formatStackDay(now, null) : ""}
        />
      ) : null}
      <form
        className={styles.editor}
        hidden={tab === "preview"}
        noValidate
        onSubmit={submit}
        ref={formRef}
      >
        {error ? (
          <p className={controls.alert} role="alert" tabIndex={-1}>
            {error}
          </p>
        ) : null}
        <FormField error={errors.title} label="Название" required>
          {(control) => (
            <input
              {...control}
              autoComplete="off"
              data-autofocus=""
              maxLength={CERTIFICATE_TITLE_LIMIT}
              onChange={(event) => update({ title: event.currentTarget.value })}
              value={draft.title}
            />
          )}
        </FormField>
        <FormField
          error={errors.description}
          label="Описание для студента"
          required
        >
          {(control) => (
            <textarea
              {...control}
              maxLength={CERTIFICATE_DESCRIPTION_LIMIT}
              onChange={(event) =>
                update({ description: event.currentTarget.value })
              }
              rows={3}
              value={draft.description}
            />
          )}
        </FormField>
        <FormField
          error={errors.executionDays}
          label="Срок изготовления, рабочих дней"
          required
        >
          {(control) => (
            <input
              {...control}
              inputMode="numeric"
              maxLength={3}
              onChange={(event) =>
                update({ executionDays: event.currentTarget.value })
              }
              value={draft.executionDays}
            />
          )}
        </FormField>
        <fieldset className={styles.choices}>
          <legend className={controls.label}>
            Способ получения{" "}
            <span aria-hidden="true" className={controls.required}>
              *
            </span>
          </legend>
          {deliveryMethods.map((method) => (
            <label className={controls.checkbox} key={method}>
              <input
                aria-invalid={errors.deliveryMethods ? true : undefined}
                checked={draft.deliveryMethods.includes(method)}
                onChange={(event) =>
                  toggleDelivery(method, event.currentTarget.checked)
                }
                type="checkbox"
              />
              {certificateDeliveryLabels[method]}
            </label>
          ))}
          {errors.deliveryMethods ? (
            <FieldError>{errors.deliveryMethods}</FieldError>
          ) : null}
        </fieldset>
        <label className={controls.checkbox}>
          <input
            checked={draft.requiresApproval}
            onChange={(event) =>
              update({ requiresApproval: event.currentTarget.checked })
            }
            type="checkbox"
          />
          Нужна подпись или согласование
        </label>
        <FieldBuilder
          errors={errors}
          fields={draft.fields}
          onChange={(fields) => update({ fields })}
        />
        <FormField
          error={errors.template}
          hint="Подстановки: {{ФИО}}, {{группа}}, {{дата}}."
          label="Шаблон текста справки"
        >
          {(control) => (
            <textarea
              {...control}
              maxLength={CERTIFICATE_TEMPLATE_LIMIT}
              onChange={(event) =>
                update({ template: event.currentTarget.value })
              }
              rows={5}
              value={draft.template}
            />
          )}
        </FormField>
        {form && form.history.length > 0 ? (
          <section aria-labelledby="form-history" className={styles.history}>
            <h3 id="form-history">Журнал изменений</h3>
            <ol>
              {form.history.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>
                      {auditActionLabels[entry.action]} · версия {entry.version}
                    </strong>
                    <span>
                      {entry.actorName}
                      {entry.changedFields.length > 0
                        ? ` · ${entry.changedFields
                            .map((name) => changedFieldLabels[name] ?? name)
                            .join(", ")}`
                        : ""}
                    </span>
                  </div>
                  <DateTimeStack align="end" value={entry.createdAt} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </form>
    </Drawer>
  );
}

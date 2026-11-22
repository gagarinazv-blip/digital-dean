"use client";

import { useActionState, useState } from "react";
import {
  createCertificateFormAction,
  updateCertificateFormAction,
  type CertificateFormActionState,
} from "./actions";
import styles from "./certificate-forms.module.css";
import type { RequestCatalogEntry, RequestCatalogField } from "@/lib/request-catalog";

type EditableField = {
  id: string;
  label: string;
  kind: "text" | "date" | "select";
  required: boolean;
  maxLength: string;
  optionsText: string;
};

const initialState: CertificateFormActionState = {};

function toEditableField(field: RequestCatalogField): EditableField {
  return {
    id: field.id,
    label: field.label,
    kind: field.kind,
    required: field.required,
    maxLength:
      field.kind === "text" && field.maxLength
        ? String(field.maxLength)
        : "",
    optionsText:
      field.kind === "select"
        ? field.options
            .map((option) => `${option.value}|${option.label}`)
            .join("\n")
        : "",
  };
}

function toFieldPayload(field: EditableField) {
  if (field.kind === "select") {
    return {
      id: field.id,
      label: field.label,
      kind: field.kind,
      required: field.required,
      options: field.optionsText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf("|");
          return separator === -1
            ? { value: line, label: "" }
            : {
                value: line.slice(0, separator).trim(),
                label: line.slice(separator + 1).trim(),
              };
        }),
    };
  }
  return {
    id: field.id,
    label: field.label,
    kind: field.kind,
    required: field.required,
    ...(field.kind === "text" && field.maxLength
      ? { maxLength: Number(field.maxLength) }
      : {}),
  };
}

function ActionFeedback({ state }: { state: CertificateFormActionState }) {
  return (
    <div aria-live="polite" className={styles.feedback}>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className={styles.success} role="status">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}

export function CertificateFormEditor({
  initialForm,
}: {
  initialForm?: RequestCatalogEntry;
}) {
  const [state, formAction, pending] = useActionState(
    initialForm ? updateCertificateFormAction : createCertificateFormAction,
    initialState,
  );
  const [fields, setFields] = useState<EditableField[]>(
    initialForm
      ? initialForm.fields.map(toEditableField)
      : [
          {
            id: "purpose",
            label: "Цель получения",
            kind: "text",
            required: true,
            maxLength: "300",
            optionsText: "",
          },
        ],
  );
  const isEditing = Boolean(initialForm);

  function updateField(index: number, patch: Partial<EditableField>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  }

  function addField() {
    const index = fields.length + 1;
    setFields((current) => [
      ...current,
      {
        id: `field_${index}`,
        label: "",
        kind: "text",
        required: false,
        maxLength: "",
        optionsText: "",
      },
    ]);
  }

  return (
    <form action={formAction} className={styles.form}>
      {initialForm ? (
        <input name="code" type="hidden" value={initialForm.code} />
      ) : (
        <label className={styles.field}>
          Код формы
          <input
            aria-describedby={
              state.fieldErrors?.code ? "certificate-form-code-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.code)}
            autoComplete="off"
            maxLength={64}
            name="code"
            placeholder="STUDY_CERTIFICATE"
            required
          />
          {state.fieldErrors?.code ? (
            <span
              className={styles.fieldError}
              id="certificate-form-code-error"
            >
              {state.fieldErrors.code}
            </span>
          ) : null}
        </label>
      )}
      <label className={styles.field}>
        Название услуги
        <input
          aria-invalid={Boolean(state.fieldErrors?.title)}
          defaultValue={initialForm?.title}
          maxLength={120}
          name="title"
          required
        />
        {state.fieldErrors?.title ? (
          <span className={styles.fieldError}>{state.fieldErrors.title}</span>
        ) : null}
      </label>
      <label className={styles.field}>
        Описание
        <textarea
          aria-invalid={Boolean(state.fieldErrors?.description)}
          defaultValue={initialForm?.description}
          maxLength={1000}
          name="description"
          required
          rows={3}
        />
        {state.fieldErrors?.description ? (
          <span className={styles.fieldError}>
            {state.fieldErrors.description}
          </span>
        ) : null}
      </label>
      <label className={styles.field}>
        Срок исполнения, рабочих дней
        <input
          aria-invalid={Boolean(state.fieldErrors?.executionDays)}
          defaultValue={initialForm?.executionDays ?? 5}
          max={365}
          min={1}
          name="executionDays"
          required
          type="number"
        />
        {state.fieldErrors?.executionDays ? (
          <span className={styles.fieldError}>
            {state.fieldErrors.executionDays}
          </span>
        ) : null}
      </label>

      <fieldset className={styles.fields}>
        <legend>Поля заявления</legend>
        {fields.map((field, index) => (
          <div className={styles.fieldRow} key={index}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                Идентификатор
                <input
                  autoComplete="off"
                  maxLength={40}
                  onChange={(event) =>
                    updateField(index, { id: event.currentTarget.value })
                  }
                  pattern="[a-z][A-Za-z0-9_]*"
                  required
                  value={field.id}
                />
              </label>
              <label className={styles.field}>
                Подпись
                <input
                  maxLength={120}
                  onChange={(event) =>
                    updateField(index, { label: event.currentTarget.value })
                  }
                  required
                  value={field.label}
                />
              </label>
              <label className={styles.field}>
                Тип поля
                <select
                  onChange={(event) =>
                    updateField(index, {
                      kind: event.currentTarget.value as EditableField["kind"],
                    })
                  }
                  value={field.kind}
                >
                  <option value="text">Текст</option>
                  <option value="date">Дата</option>
                  <option value="select">Список</option>
                </select>
              </label>
              {field.kind === "text" ? (
                <label className={styles.field}>
                  Лимит символов
                  <input
                    max={2000}
                    min={1}
                    onChange={(event) =>
                      updateField(index, {
                        maxLength: event.currentTarget.value,
                      })
                    }
                    type="number"
                    value={field.maxLength}
                  />
                </label>
              ) : null}
              {field.kind === "select" ? (
                <label className={styles.field}>
                  Варианты (код|подпись, по одному на строку)
                  <textarea
                    onChange={(event) =>
                      updateField(index, {
                        optionsText: event.currentTarget.value,
                      })
                    }
                    placeholder={"SESSION|Сессия\nOTHER|Другое"}
                    rows={3}
                    value={field.optionsText}
                  />
                </label>
              ) : null}
              <label className={styles.requiredToggle}>
                <input
                  checked={field.required}
                  onChange={(event) =>
                    updateField(index, { required: event.currentTarget.checked })
                  }
                  type="checkbox"
                />
                Обязательное поле
              </label>
            </div>
            {fields.length > 1 ? (
              <button
                className={styles.removeField}
                onClick={() =>
                  setFields((current) =>
                    current.filter((_, fieldIndex) => fieldIndex !== index),
                  )
                }
                type="button"
              >
                Удалить поле
              </button>
            ) : null}
          </div>
        ))}
        <input
          name="fields"
          type="hidden"
          value={JSON.stringify(fields.map(toFieldPayload))}
        />
        {state.fieldErrors?.fields ? (
          <p className={styles.fieldError} role="alert">
            {state.fieldErrors.fields}
          </p>
        ) : null}
        <button
          className={styles.secondaryButton}
          onClick={addField}
          type="button"
        >
          Добавить поле
        </button>
      </fieldset>

      {initialForm ? (
        <label className={styles.requiredToggle}>
          <input
            defaultChecked={initialForm.active}
            name="active"
            type="checkbox"
            value="true"
          />
          Показывать студентам
        </label>
      ) : (
        <input name="active" type="hidden" value="true" />
      )}

      <ActionFeedback state={state} />
      <button className={styles.primaryButton} disabled={pending} type="submit">
        {pending
          ? "Сохраняем…"
          : isEditing
            ? "Сохранить форму"
            : "Создать форму"}
      </button>
    </form>
  );
}

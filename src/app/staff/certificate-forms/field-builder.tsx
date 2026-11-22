"use client";

import { ArrowDown, ArrowUp, Plus, Trash } from "iconoir-react";
import { FieldError, FormField } from "@/components/ui/form-field";
import controls from "@/components/ui/controls.module.css";
import {
  CERTIFICATE_FIELDS_LIMIT,
  getFieldErrorKey,
  makeFieldKey,
  type CertificateFormErrors,
} from "@/lib/certificate-form-validation";
import {
  requestCatalogFieldKindLabels,
  type RequestCatalogField,
  type RequestCatalogFieldKind,
} from "@/lib/request-catalog";
import styles from "./certificate-forms.module.css";

export type DraftField = {
  /** Ключ React: не меняется при переименовании и перестановке. */
  rowKey: string;
  id: string;
  /** Ключ задан вручную или уже сохранён: подпись его больше не меняет. */
  isIdFixed: boolean;
  label: string;
  hint: string;
  kind: RequestCatalogFieldKind;
  required: boolean;
  maxLength: string;
  min: string;
  max: string;
  options: { value: string; label: string }[];
};

let rowCounter = 0;

function nextRowKey(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function createDraftField(taken: ReadonlySet<string>): DraftField {
  return {
    rowKey: nextRowKey(),
    id: makeFieldKey("", taken),
    isIdFixed: false,
    label: "",
    hint: "",
    kind: "text",
    required: false,
    maxLength: "",
    min: "",
    max: "",
    options: [{ value: "OPTION_1", label: "" }],
  };
}

export function toDraftField(field: RequestCatalogField): DraftField {
  return {
    ...createDraftField(new Set()),
    id: field.id,
    isIdFixed: true,
    label: field.label,
    hint: field.hint ?? "",
    kind: field.kind,
    required: field.required,
    maxLength:
      field.kind === "text" && field.maxLength ? String(field.maxLength) : "",
    min: field.kind === "number" && field.min !== undefined ? String(field.min) : "",
    max: field.kind === "number" && field.max !== undefined ? String(field.max) : "",
    ...(field.kind === "select"
      ? { options: field.options.map((option) => ({ ...option })) }
      : {}),
  };
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(",", ".");
  // NaN вернёт схема как ошибку поля.
  return trimmed ? Number(trimmed) : undefined;
}

export function toFieldInput(field: DraftField): Record<string, unknown> {
  return {
    id: field.id,
    label: field.label,
    hint: field.hint,
    kind: field.kind,
    required: field.required,
    ...(field.kind === "text" ? { maxLength: parseNumber(field.maxLength) } : {}),
    ...(field.kind === "number"
      ? { min: parseNumber(field.min), max: parseNumber(field.max) }
      : {}),
    ...(field.kind === "select" ? { options: field.options } : {}),
  };
}

function makeOptionValue(options: readonly { value: string }[]): string {
  const taken = new Set(options.map((option) => option.value));
  let index = options.length + 1;
  while (taken.has(`OPTION_${index}`)) index += 1;
  return `OPTION_${index}`;
}

function OptionsEditor({
  field,
  error,
  onChange,
}: {
  field: DraftField;
  error?: string;
  onChange: (options: DraftField["options"]) => void;
}) {
  return (
    <fieldset className={styles.options}>
      <legend className={controls.label}>Варианты списка</legend>
      {field.options.map((option, index) => (
        <div className={styles.option} key={option.value}>
          <input
            aria-invalid={error ? true : undefined}
            aria-label={`Вариант ${index + 1}`}
            className={controls.control}
            maxLength={120}
            onChange={(event) =>
              onChange(
                field.options.map((item) =>
                  item.value === option.value
                    ? { ...item, label: event.currentTarget.value }
                    : item,
                ),
              )
            }
            placeholder={`Вариант ${index + 1}`}
            value={option.label}
          />
          <button
            aria-label={`Удалить вариант ${index + 1}`}
            className={controls.iconButton}
            disabled={field.options.length === 1}
            onClick={() =>
              onChange(
                field.options.filter((item) => item.value !== option.value),
              )
            }
            type="button"
          >
            <Trash aria-hidden="true" strokeWidth={1.8} />
          </button>
        </div>
      ))}
      {error ? <FieldError>{error}</FieldError> : null}
      <button
        className={controls.ghost}
        onClick={() =>
          onChange([
            ...field.options,
            { value: makeOptionValue(field.options), label: "" },
          ])
        }
        type="button"
      >
        <Plus aria-hidden="true" height={18} width={18} />
        Добавить вариант
      </button>
    </fieldset>
  );
}

export function FieldBuilder({
  fields,
  errors,
  onChange,
}: {
  fields: DraftField[];
  errors: CertificateFormErrors;
  onChange: (fields: DraftField[]) => void;
}) {
  function update(index: number, patch: Partial<DraftField>) {
    onChange(
      fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  }

  function updateLabel(index: number, label: string) {
    const field = fields[index];
    const taken = new Set(
      fields.filter((item) => item !== field).map((item) => item.id),
    );
    update(index, {
      label,
      ...(field.isIdFixed ? {} : { id: makeFieldKey(label, taken) }),
    });
  }

  function move(index: number, offset: -1 | 1) {
    const next = [...fields];
    const [field] = next.splice(index, 1);
    next.splice(index + offset, 0, field);
    onChange(next);
  }

  return (
    <section aria-labelledby="builder-title" className={styles.builder}>
      <div className={styles.builderHeading}>
        <h3 id="builder-title">Поля заявки</h3>
        <span className={controls.hint}>
          {fields.length} из {CERTIFICATE_FIELDS_LIMIT}
        </span>
      </div>
      {errors.fields ? (
        <p className={controls.alert} role="alert">
          {errors.fields}
        </p>
      ) : null}
      <ol className={styles.builderList}>
        {fields.map((field, index) => {
          const error = (property: string) =>
            errors[getFieldErrorKey(index, property)];
          const title = field.label.trim() || `Поле ${index + 1}`;
          return (
            <li className={styles.builderItem} key={field.rowKey}>
              <div className={styles.builderItemHeading}>
                <strong>
                  {index + 1}. {title}
                </strong>
                <div className={styles.builderButtons}>
                  <button
                    aria-label={`Поднять «${title}» выше`}
                    className={controls.iconButton}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    title="Выше"
                    type="button"
                  >
                    <ArrowUp aria-hidden="true" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={`Опустить «${title}» ниже`}
                    className={controls.iconButton}
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, 1)}
                    title="Ниже"
                    type="button"
                  >
                    <ArrowDown aria-hidden="true" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={`Удалить «${title}»`}
                    className={controls.iconButton}
                    disabled={fields.length === 1}
                    onClick={() =>
                      onChange(fields.filter((item) => item !== field))
                    }
                    title="Удалить"
                    type="button"
                  >
                    <Trash aria-hidden="true" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
              <div className={styles.builderGrid}>
                <FormField error={error("label")} label="Подпись" required>
                  {(control) => (
                    <input
                      {...control}
                      maxLength={120}
                      onChange={(event) =>
                        updateLabel(index, event.currentTarget.value)
                      }
                      value={field.label}
                    />
                  )}
                </FormField>
                <FormField error={error("kind")} label="Тип поля" required>
                  {(control) => (
                    <select
                      {...control}
                      onChange={(event) =>
                        update(index, {
                          kind: event.currentTarget
                            .value as RequestCatalogFieldKind,
                        })
                      }
                      value={field.kind}
                    >
                      {Object.entries(requestCatalogFieldKindLabels).map(
                        ([kind, label]) => (
                          <option key={kind} value={kind}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  )}
                </FormField>
                <FormField error={error("hint")} label="Подсказка">
                  {(control) => (
                    <input
                      {...control}
                      maxLength={200}
                      onChange={(event) =>
                        update(index, { hint: event.currentTarget.value })
                      }
                      value={field.hint}
                    />
                  )}
                </FormField>
                <FormField
                  error={error("id")}
                  hint="Латиницей, без пробелов."
                  label="Ключ"
                  required
                >
                  {(control) => (
                    <input
                      {...control}
                      autoComplete="off"
                      maxLength={40}
                      onChange={(event) =>
                        update(index, {
                          id: event.currentTarget.value,
                          isIdFixed: true,
                        })
                      }
                      spellCheck={false}
                      value={field.id}
                    />
                  )}
                </FormField>
                {field.kind === "text" ? (
                  <FormField error={error("maxLength")} label="Лимит символов">
                    {(control) => (
                      <input
                        {...control}
                        inputMode="numeric"
                        onChange={(event) =>
                          update(index, { maxLength: event.currentTarget.value })
                        }
                        placeholder="Без лимита"
                        value={field.maxLength}
                      />
                    )}
                  </FormField>
                ) : null}
                {field.kind === "number" ? (
                  <>
                    <FormField error={error("min")} label="Минимум">
                      {(control) => (
                        <input
                          {...control}
                          inputMode="decimal"
                          onChange={(event) =>
                            update(index, { min: event.currentTarget.value })
                          }
                          value={field.min}
                        />
                      )}
                    </FormField>
                    <FormField error={error("max")} label="Максимум">
                      {(control) => (
                        <input
                          {...control}
                          inputMode="decimal"
                          onChange={(event) =>
                            update(index, { max: event.currentTarget.value })
                          }
                          value={field.max}
                        />
                      )}
                    </FormField>
                  </>
                ) : null}
              </div>
              {field.kind === "select" ? (
                <OptionsEditor
                  error={error("options")}
                  field={field}
                  onChange={(options) => update(index, { options })}
                />
              ) : null}
              <label className={controls.checkbox}>
                <input
                  checked={field.required}
                  onChange={(event) =>
                    update(index, { required: event.currentTarget.checked })
                  }
                  type="checkbox"
                />
                Обязательное поле
              </label>
            </li>
          );
        })}
      </ol>
      <button
        className={controls.secondary}
        disabled={fields.length >= CERTIFICATE_FIELDS_LIMIT}
        onClick={() =>
          onChange([
            ...fields,
            createDraftField(new Set(fields.map((field) => field.id))),
          ])
        }
        type="button"
      >
        <Plus aria-hidden="true" height={18} width={18} />
        Добавить поле
      </button>
    </section>
  );
}

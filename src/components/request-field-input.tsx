"use client";

import { FieldError, FormField } from "@/components/ui/form-field";
import controls from "@/components/ui/controls.module.css";
import type { RequestCatalogField } from "@/lib/request-catalog";

const fileAccept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

function getHint(field: RequestCatalogField): string | undefined {
  const details: string[] = field.hint ? [field.hint] : [];
  if (field.kind === "text" && field.maxLength) {
    details.push(`До ${field.maxLength} символов.`);
  }
  if (field.kind === "number") {
    if (field.min !== undefined && field.max !== undefined) {
      details.push(`От ${field.min} до ${field.max}.`);
    } else if (field.min !== undefined) details.push(`Не меньше ${field.min}.`);
    else if (field.max !== undefined) details.push(`Не больше ${field.max}.`);
  }
  if (field.kind === "file") details.push("PDF, JPG или PNG до 5 МБ.");
  return details.length > 0 ? details.join(" ") : undefined;
}

// Поле заявки по схеме вида справки: им пользуются заказ справки и предпросмотр.
export function RequestFieldInput({
  field,
  value,
  error,
  disabled = false,
  onChange,
  onBlur,
}: {
  field: RequestCatalogField;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const name = `field.${field.id}`;
  const hint = getHint(field);

  if (field.kind === "checkbox") {
    const errorId = `field-${field.id}-error`;
    const hintId = `field-${field.id}-hint`;
    return (
      <div className={controls.field}>
        <label className={controls.checkbox}>
          <input
            aria-describedby={
              [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") ||
              undefined
            }
            aria-invalid={error ? true : undefined}
            aria-required={field.required || undefined}
            checked={value === "true"}
            disabled={disabled}
            name={name}
            onBlur={onBlur}
            onChange={(event) =>
              onChange(event.currentTarget.checked ? "true" : "")
            }
            type="checkbox"
            value="true"
          />
          <span>
            {field.label}
            {field.required ? (
              <span aria-hidden="true" className={controls.required}>
                {" "}
                *
              </span>
            ) : null}
          </span>
        </label>
        {hint ? (
          <p className={controls.hint} id={hintId}>
            {hint}
          </p>
        ) : null}
        {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      </div>
    );
  }

  return (
    <FormField
      error={error}
      hint={hint}
      label={field.label}
      required={field.required}
    >
      {(control) => {
        const shared = { ...control, name, disabled, onBlur };
        if (field.kind === "select") {
          return (
            <select
              {...shared}
              onChange={(event) => onChange(event.currentTarget.value)}
              value={value}
            >
              <option value="">Выберите значение</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        }
        if (field.kind === "file") {
          return (
            <input
              {...shared}
              accept={fileAccept}
              name={`file.${field.id}`}
              onChange={(event) =>
                onChange(event.currentTarget.files?.[0]?.name ?? "")
              }
              type="file"
            />
          );
        }
        return (
          <input
            {...shared}
            inputMode={field.kind === "number" ? "decimal" : undefined}
            maxLength={field.kind === "text" ? field.maxLength : undefined}
            onChange={(event) => onChange(event.currentTarget.value)}
            type={field.kind === "date" ? "date" : "text"}
            value={value}
          />
        );
      }}
    </FormField>
  );
}

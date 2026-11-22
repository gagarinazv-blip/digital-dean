import {
  getRequestCatalogEntry,
  requestCatalog,
  type RequestCatalogEntry,
} from "@/lib/request-catalog";

export type RequestFormValues = {
  catalogCode: unknown;
  fields: unknown;
  description: unknown;
};

export type ValidatedRequestForm = {
  service: RequestCatalogEntry | undefined;
  fields: Record<string, string>;
  description: string;
  errors: Record<string, string>;
  valid: boolean;
};

const MAX_DESCRIPTION_LENGTH = 1000;

export function validateRequestForm(
  values: RequestFormValues,
  services: readonly RequestCatalogEntry[] = requestCatalog,
): ValidatedRequestForm {
  const errors: Record<string, string> = {};
  const service =
    typeof values.catalogCode === "string"
      ? getRequestCatalogEntry(values.catalogCode, services)
      : undefined;

  if (!service) {
    errors.catalogCode = "Выберите тип заявки из списка.";
  }

  const inputFields = getStringRecord(values.fields);
  if (!inputFields) {
    errors.fields = "Проверьте заполнение полей заявки.";
  }

  const fields: Record<string, string> = {};
  if (service && inputFields) {
    const allowedFieldIds: ReadonlySet<string> = new Set(
      service.fields.map((field) => field.id),
    );
    if (Object.keys(inputFields).some((fieldId) => !allowedFieldIds.has(fieldId))) {
      errors.fields = "Форма содержит неизвестные поля.";
    }

    for (const field of service.fields) {
      const value = inputFields[field.id]?.trim() ?? "";
      fields[field.id] = value;

      if (field.required && !value) {
        errors[field.id] =
          field.kind === "checkbox"
            ? "Отметьте этот пункт."
            : field.kind === "file"
              ? "Приложите файл."
              : "Заполните это поле.";
        continue;
      }

      if (field.kind === "text" && field.maxLength && value.length > field.maxLength) {
        errors[field.id] =
          `Максимальная длина — ${field.maxLength} символов.`;
      } else if (field.kind === "date" && value && !isValidDate(value)) {
        errors[field.id] = "Укажите корректную дату.";
      } else if (field.kind === "number" && value) {
        const number = Number(value.replace(",", "."));
        if (!/^-?\d+(?:[.,]\d+)?$/.test(value) || !Number.isFinite(number)) {
          errors[field.id] = "Введите число.";
        } else if (field.min !== undefined && number < field.min) {
          errors[field.id] = `Значение не может быть меньше ${field.min}.`;
        } else if (field.max !== undefined && number > field.max) {
          errors[field.id] = `Значение не может быть больше ${field.max}.`;
        }
      } else if (field.kind === "checkbox" && value && value !== "true") {
        errors[field.id] = "Отметьте этот пункт.";
      } else if (
        field.kind === "select" &&
        value &&
        !field.options.some((option) => option.value === value)
      ) {
        errors[field.id] = "Выберите значение из списка.";
      }
    }

    if (
      service.code === "CALL_CERTIFICATE" &&
      fields.periodStart &&
      fields.periodEnd &&
      isValidDate(fields.periodStart) &&
      isValidDate(fields.periodEnd) &&
      fields.periodEnd < fields.periodStart
    ) {
      errors.periodEnd = "Дата окончания не может быть раньше даты начала.";
    }
  }

  const description =
    typeof values.description === "string" ? values.description.trim() : "";
  if (
    typeof values.description !== "string" &&
    values.description !== null &&
    values.description !== undefined
  ) {
    errors.description = "Проверьте описание заявки.";
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Максимальная длина описания — ${MAX_DESCRIPTION_LENGTH} символов.`;
  }

  return {
    service,
    fields,
    description,
    errors,
    valid: Object.keys(errors).length === 0,
  };
}

function getStringRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries: [string, string][] = [];
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      return null;
    }
    entries.push([key, entryValue]);
  }

  return Object.fromEntries(entries);
}

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

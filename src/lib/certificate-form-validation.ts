import {
  validateRequestCatalogField,
  type RequestCatalogField,
} from "@/lib/request-catalog";

export type CertificateFormInput = {
  code: string;
  title: string;
  description: string;
  executionDays: number;
  fields: RequestCatalogField[];
  active: boolean;
};

export type CertificateFormValidation =
  | { valid: true; value: CertificateFormInput }
  | { valid: false; errors: Record<string, string> };

export function validateCertificateFormInput(value: unknown): CertificateFormValidation {
  const record = getRecord(value);
  if (!record) {
    return {
      valid: false,
      errors: { form: "Проверьте заполнение формы справки." },
    };
  }

  const errors: Record<string, string> = {};
  const code = typeof record.code === "string" ? record.code.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const executionDays =
    typeof record.executionDays === "number" ? record.executionDays : NaN;
  const active = record.active === true;

  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(code)) {
    errors.code = "Код: от 3 до 64 латинских букв, цифр или подчёркиваний.";
  }
  if (!title || title.length > 120) {
    errors.title = "Введите название (не более 120 символов).";
  }
  if (!description || description.length > 1000) {
    errors.description = "Введите описание (не более 1000 символов).";
  }
  if (
    !Number.isSafeInteger(executionDays) ||
    executionDays < 1 ||
    executionDays > 365
  ) {
    errors.executionDays = "Укажите срок от 1 до 365 рабочих дней.";
  }

  const fields = parseFields(record.fields);
  if (!fields) {
    errors.fields = "Добавьте от 1 до 20 корректно заполненных полей.";
  } else if (new Set(fields.map((field) => field.id)).size !== fields.length) {
    errors.fields = "Идентификаторы полей должны быть уникальными.";
  }

  if (Object.keys(errors).length > 0 || !fields) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: { code, title, description, executionDays, fields, active },
  };
}

function parseFields(value: unknown): RequestCatalogField[] | null {
  let rawFields: unknown = value;
  if (typeof value === "string") {
    try {
      rawFields = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(rawFields) || rawFields.length < 1 || rawFields.length > 20) {
    return null;
  }

  const fields: RequestCatalogField[] = [];
  for (const rawField of rawFields) {
    const field = validateRequestCatalogField(rawField);
    if (!field) {
      return null;
    }
    fields.push(field);
  }
  return fields;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return Object.fromEntries(Object.entries(value));
}

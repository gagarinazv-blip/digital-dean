import {
  certificateDeliveryLabels,
  getUnknownTemplatePlaceholders,
  requestCatalogFieldKindLabels,
  validateRequestCatalogField,
  type CertificateDelivery,
  type RequestCatalogField,
  type RequestCatalogFieldKind,
} from "@/lib/request-catalog";

// Единственная схема формы «Вид справки»: её вызывают и конструктор в
// браузере, и серверное действие перед записью.

export const CERTIFICATE_TITLE_LIMIT = 120;
export const CERTIFICATE_DESCRIPTION_LIMIT = 1000;
export const CERTIFICATE_TEMPLATE_LIMIT = 4000;
export const CERTIFICATE_FIELDS_LIMIT = 20;
export const CERTIFICATE_OPTIONS_LIMIT = 30;

export type CertificateFormInput = {
  title: string;
  description: string;
  executionDays: number;
  deliveryMethods: CertificateDelivery[];
  requiresApproval: boolean;
  template: string;
  fields: RequestCatalogField[];
};

export type CertificateFormErrors = Record<string, string>;

export type CertificateFormValidation =
  | { valid: true; value: CertificateFormInput }
  | { valid: false; errors: CertificateFormErrors };

export function normalizeCertificateTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

/** Ключ ошибки поля конструктора: fields.2.label */
export function getFieldErrorKey(index: number, property: string): string {
  return `fields.${index}.${property}`;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return Object.fromEntries(Object.entries(value));
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isFieldKind(value: unknown): value is RequestCatalogFieldKind {
  return typeof value === "string" && value in requestCatalogFieldKindLabels;
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return (
    value === undefined || (typeof value === "number" && Number.isFinite(value))
  );
}

function validateOptions(
  value: unknown,
  addError: (property: string, message: string) => void,
): void {
  if (!Array.isArray(value) || value.length === 0) {
    addError("options", "Добавьте хотя бы один вариант.");
    return;
  }
  if (value.length > CERTIFICATE_OPTIONS_LIMIT) {
    addError("options", `Не больше ${CERTIFICATE_OPTIONS_LIMIT} вариантов.`);
    return;
  }
  const labels = value.map((option) => getText(getRecord(option)?.label));
  const values = value.map((option) => getText(getRecord(option)?.value));
  if (labels.some((label) => !label)) {
    addError("options", "Заполните подписи всех вариантов.");
  } else if (labels.some((label) => label.length > 120)) {
    addError("options", "Подпись варианта — не более 120 символов.");
  } else if (
    new Set(labels.map((label) => label.toLocaleLowerCase("ru-RU"))).size !==
      labels.length ||
    new Set(values).size !== values.length
  ) {
    addError("options", "Варианты не должны повторяться.");
  }
}

function validateFields(
  value: unknown,
  errors: CertificateFormErrors,
): RequestCatalogField[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.fields = "Добавьте хотя бы одно поле заявки.";
    return [];
  }
  if (value.length > CERTIFICATE_FIELDS_LIMIT) {
    errors.fields = `В форме может быть не больше ${CERTIFICATE_FIELDS_LIMIT} полей.`;
    return [];
  }

  const seenKeys = new Set<string>();
  const fields: RequestCatalogField[] = [];
  value.forEach((rawField, index) => {
    const errorCount = Object.keys(errors).length;
    const addError = (property: string, message: string) => {
      errors[getFieldErrorKey(index, property)] ??= message;
    };
    const record = getRecord(rawField) ?? {};
    const label = getText(record.label);
    const id = getText(record.id);
    const hint = getText(record.hint);

    if (!label) addError("label", "Введите подпись поля.");
    else if (label.length > 120) {
      addError("label", "Подпись — не более 120 символов.");
    }
    if (hint.length > 200) addError("hint", "Подсказка — не более 200 символов.");
    if (!/^[a-z][A-Za-z0-9_]{0,39}$/.test(id)) {
      addError(
        "id",
        "Ключ: латинские буквы, цифры и «_», начинается со строчной буквы.",
      );
    } else if (seenKeys.has(id)) {
      addError("id", "Такой ключ уже есть у другого поля.");
    }
    seenKeys.add(id);

    if (!isFieldKind(record.kind)) {
      addError("kind", "Выберите тип поля.");
    } else if (record.kind === "select") {
      validateOptions(record.options, addError);
    } else if (record.kind === "number") {
      if (!isOptionalNumber(record.min)) addError("min", "Введите число.");
      if (!isOptionalNumber(record.max)) addError("max", "Введите число.");
      else if (
        typeof record.min === "number" &&
        typeof record.max === "number" &&
        record.min > record.max
      ) {
        addError("max", "Максимум не может быть меньше минимума.");
      }
    } else if (
      record.kind === "text" &&
      record.maxLength !== undefined &&
      (!Number.isSafeInteger(record.maxLength) ||
        Number(record.maxLength) < 1 ||
        Number(record.maxLength) > 2000)
    ) {
      addError("maxLength", "Укажите лимит от 1 до 2000 символов.");
    }

    if (Object.keys(errors).length > errorCount) return;
    const field = validateRequestCatalogField(record);
    if (field) fields.push(field);
    else addError("kind", "Проверьте настройки поля.");
  });
  return fields;
}

export function validateCertificateFormInput(
  value: unknown,
): CertificateFormValidation {
  const record = getRecord(value);
  if (!record) {
    return {
      valid: false,
      errors: { form: "Проверьте заполнение формы справки." },
    };
  }

  const errors: CertificateFormErrors = {};
  const title = getText(record.title).replace(/\s+/g, " ");
  const description = getText(record.description);
  const template = getText(record.template);
  const { executionDays, requiresApproval } = record;
  const deliveryMethods = [
    ...new Set(Array.isArray(record.deliveryMethods) ? record.deliveryMethods : []),
  ].filter(
    (method): method is CertificateDelivery =>
      typeof method === "string" && method in certificateDeliveryLabels,
  );

  if (!title) errors.title = "Введите название справки.";
  else if (title.length > CERTIFICATE_TITLE_LIMIT) {
    errors.title = `Название — не более ${CERTIFICATE_TITLE_LIMIT} символов.`;
  }
  if (!description) errors.description = "Опишите справку для студента.";
  else if (description.length > CERTIFICATE_DESCRIPTION_LIMIT) {
    errors.description = `Описание — не более ${CERTIFICATE_DESCRIPTION_LIMIT} символов.`;
  }
  if (
    typeof executionDays !== "number" ||
    !Number.isSafeInteger(executionDays) ||
    executionDays < 1 ||
    executionDays > 365
  ) {
    errors.executionDays = "Срок — целое число рабочих дней от 1 до 365.";
  }
  if (deliveryMethods.length === 0) {
    errors.deliveryMethods = "Выберите хотя бы один способ получения.";
  }
  if (template.length > CERTIFICATE_TEMPLATE_LIMIT) {
    errors.template = `Шаблон — не более ${CERTIFICATE_TEMPLATE_LIMIT} символов.`;
  } else {
    const unknown = getUnknownTemplatePlaceholders(template);
    if (unknown.length > 0) {
      errors.template = `Неизвестная подстановка {{${unknown[0]}}}. Доступны {{ФИО}}, {{группа}} и {{дата}}.`;
    }
  }

  const fields = validateFields(record.fields, errors);
  if (Object.keys(errors).length > 0 || typeof executionDays !== "number") {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      title,
      description,
      executionDays,
      deliveryMethods,
      requiresApproval: requiresApproval === true,
      template,
      fields,
    },
  };
}

const transliteration: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterate(value: string): string {
  return [...value.toLocaleLowerCase("ru-RU")]
    .map((character) => transliteration[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Код формы из названия: «Справка о стипендии» → SPRAVKA_O_STIPENDII. */
export function makeCertificateCode(title: string): string {
  const base = transliterate(title).toUpperCase().slice(0, 48).replace(/_+$/, "");
  return /^[A-Z]/.test(base) && base.length >= 3 ? base : `FORM_${base || "NEW"}`;
}

export function makeUniqueName(
  base: string,
  taken: ReadonlySet<string>,
  separator = "_",
): string {
  if (!taken.has(base)) return base;
  let index = 2;
  while (taken.has(`${base}${separator}${index}`)) index += 1;
  return `${base}${separator}${index}`;
}

export function makeFieldKey(
  label: string,
  taken: ReadonlySet<string>,
): string {
  const base = transliterate(label).slice(0, 32).replace(/_+$/, "");
  return makeUniqueName(/^[a-z]/.test(base) ? base : `field_${base || "1"}`, taken);
}

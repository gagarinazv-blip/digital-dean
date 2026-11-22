import type { RequestType } from "@/generated/prisma/enums";

type RequestCatalogFieldBase = {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
};

export type RequestCatalogField = RequestCatalogFieldBase &
  (
    | { kind: "text" | "date"; maxLength?: number }
    | { kind: "number"; min?: number; max?: number }
    | { kind: "checkbox" | "file" }
    | {
        kind: "select";
        options: readonly { value: string; label: string }[];
      }
  );

export type RequestCatalogFieldKind = RequestCatalogField["kind"];

export const requestCatalogFieldKindLabels: Record<
  RequestCatalogFieldKind,
  string
> = {
  text: "Текст",
  number: "Число",
  date: "Дата",
  select: "Выпадающий список",
  checkbox: "Флажок",
  file: "Файл",
};

export const certificateDeliveryLabels = {
  ELECTRONIC: "Электронно",
  DEAN_OFFICE: "В деканате",
} as const;

export type CertificateDelivery = keyof typeof certificateDeliveryLabels;

export type RequestCatalogEntry = {
  code: string;
  active: boolean;
  requestType: RequestType;
  title: string;
  description: string;
  executionDays: number;
  fields: readonly RequestCatalogField[];
  version?: number;
  deliveryMethods?: readonly CertificateDelivery[];
  requiresApproval?: boolean;
  template?: string;
};

export type RequestCatalogSnapshot = Omit<RequestCatalogEntry, "active">;

export const requestCatalog = [
  {
    code: "STUDY_CERTIFICATE",
    active: true,
    requestType: "CERTIFICATE",
    title: "Справка об обучении",
    description: "Подтверждение факта обучения в учебном заведении.",
    executionDays: 5,
    fields: [
      {
        id: "purpose",
        label: "Куда предоставляется / цель",
        kind: "text",
        required: true,
        maxLength: 300,
      },
    ],
  },
  {
    code: "CALL_CERTIFICATE",
    active: true,
    requestType: "CERTIFICATE",
    title: "Справка-вызов",
    description: "Справка для предоставления по месту работы на период аттестации.",
    executionDays: 7,
    fields: [
      {
        id: "periodStart",
        label: "Начало периода",
        kind: "date",
        required: true,
      },
      {
        id: "periodEnd",
        label: "Окончание периода",
        kind: "date",
        required: true,
      },
      {
        id: "reason",
        label: "Причина вызова",
        kind: "select",
        required: true,
        options: [
          { value: "SESSION", label: "Промежуточная аттестация" },
          { value: "STATE_EXAMS", label: "Государственная итоговая аттестация" },
          { value: "OTHER", label: "Иная обязательная аттестация" },
        ],
      },
    ],
  },
] as const satisfies readonly {
  code: string;
  active: boolean;
  requestType: RequestType;
  title: string;
  description: string;
  executionDays: number;
  fields: readonly RequestCatalogField[];
}[];

export type RequestCatalogCode = (typeof requestCatalog)[number]["code"];

export type RequestProfileSnapshot = {
  fullName: string;
  faculty: string;
  direction: string;
  course: number;
  groupName: string;
  recordBookNumber: string | null;
  studyForm: string | null;
};

export function getRequestCatalogEntry(
  code: string | null | undefined,
  entries: readonly RequestCatalogEntry[] = requestCatalog,
): RequestCatalogEntry | undefined {
  return entries.find((entry) => entry.code === code && entry.active);
}

export function getRequestCatalogSnapshot(
  value: unknown,
): RequestCatalogSnapshot | null {
  const record = getUnknownRecord(value);
  if (
    !record ||
    typeof record.code !== "string" ||
    typeof record.title !== "string" ||
    typeof record.description !== "string" ||
    typeof record.executionDays !== "number" ||
    !Number.isSafeInteger(record.executionDays) ||
    record.executionDays < 1 ||
    !Array.isArray(record.fields)
  ) {
    return null;
  }

  const fields: RequestCatalogField[] = [];
  for (const value of record.fields) {
    const field = parseRequestCatalogField(value);
    if (!field) {
      return null;
    }
    fields.push(field);
  }

  return {
    code: record.code,
    title: record.title,
    description: record.description,
    executionDays: record.executionDays,
    requestType:
      record.requestType === "CERTIFICATE" ||
      record.requestType === "APPLICATION" ||
      record.requestType === "OTHER"
        ? record.requestType
        : "CERTIFICATE",
    fields,
    // В снимках старых заявок этих сведений нет.
    version:
      typeof record.version === "number" && Number.isSafeInteger(record.version)
        ? record.version
        : 1,
    deliveryMethods: parseDeliveryMethods(record.deliveryMethods),
    requiresApproval: record.requiresApproval === true,
    template: typeof record.template === "string" ? record.template : "",
  };
}

function parseDeliveryMethods(value: unknown): CertificateDelivery[] {
  const methods = Array.isArray(value)
    ? value.filter(
        (method): method is CertificateDelivery =>
          typeof method === "string" && method in certificateDeliveryLabels,
      )
    : [];
  return methods.length > 0 ? methods : ["ELECTRONIC"];
}

export function formatDeliveryMethods(
  methods: readonly CertificateDelivery[] | undefined,
): string {
  return parseDeliveryMethods(methods)
    .map((method) => certificateDeliveryLabels[method])
    .join(" или ");
}

const templatePlaceholders = ["ФИО", "группа", "дата"] as const;
const placeholderPattern = /\{\{\s*([^{}]*?)\s*\}\}/g;

export function getUnknownTemplatePlaceholders(template: string): string[] {
  return [...template.matchAll(placeholderPattern)]
    .map((match) => match[1])
    .filter((name) => !templatePlaceholders.some((known) => known === name));
}

export function renderCertificateTemplate(
  template: string,
  values: { fullName: string; groupName: string; date: string },
): string {
  const replacements: Record<string, string> = {
    ФИО: values.fullName,
    группа: values.groupName,
    дата: values.date,
  };
  return template.replace(
    placeholderPattern,
    (match, name: string) => replacements[name] ?? match,
  );
}

export function createRequestCatalogSnapshot(
  entry: RequestCatalogEntry,
): RequestCatalogSnapshot {
  return {
    code: entry.code,
    title: entry.title,
    description: entry.description,
    executionDays: entry.executionDays,
    requestType: entry.requestType,
    fields: entry.fields.map((field) => ({
      ...field,
      ...(field.kind === "select"
        ? { options: field.options.map((option) => ({ ...option })) }
        : {}),
    })),
    version: entry.version ?? 1,
    deliveryMethods: [...parseDeliveryMethods(entry.deliveryMethods)],
    requiresApproval: entry.requiresApproval ?? false,
    template: entry.template ?? "",
  };
}

export function getRequestCatalogTitle(
  code: string | null | undefined,
  fallback: string,
  snapshot?: unknown,
): string {
  const savedSnapshot = getRequestCatalogSnapshot(snapshot);
  return (
    (savedSnapshot && savedSnapshot.code === code
      ? savedSnapshot.title
      : undefined) ??
    getRequestCatalogEntry(code)?.title ??
    fallback
  );
}

export function getRequestFieldEntries(
  code: string | null | undefined,
  value: unknown,
  snapshot?: unknown,
): { id: string; label: string; value: string; kind: RequestCatalogFieldKind }[] {
  const savedSnapshot = getRequestCatalogSnapshot(snapshot);
  const service =
    savedSnapshot && savedSnapshot.code === code
      ? savedSnapshot
      : getRequestCatalogEntry(code);
  const fields = getStringRecord(value);
  if (!service || !fields) {
    return [];
  }

  return service.fields.flatMap((field) => {
    const rawValue = fields[field.id];
    if (!rawValue) {
      return [];
    }

    const displayValue =
      field.kind === "select"
        ? (field.options.find((option) => option.value === rawValue)?.label ??
          rawValue)
        : field.kind === "checkbox"
          ? "Да"
          : rawValue;
    return [
      { id: field.id, label: field.label, value: displayValue, kind: field.kind },
    ];
  });
}

export function getRequestFieldValues(
  code: string | null | undefined,
  value: unknown,
  snapshot?: unknown,
): Record<string, string> {
  const savedSnapshot = getRequestCatalogSnapshot(snapshot);
  const service =
    savedSnapshot && savedSnapshot.code === code
      ? savedSnapshot
      : getRequestCatalogEntry(code);
  const fields = getStringRecord(value);
  if (!service || !fields) {
    return {};
  }

  return Object.fromEntries(
    service.fields.flatMap((field) => {
      // Файл прежней заявки нужно приложить заново.
      const fieldValue = field.kind === "file" ? "" : fields[field.id];
      return fieldValue ? [[field.id, fieldValue]] : [];
    }),
  );
}

export function getRequestProfileEntries(
  value: unknown,
): { label: string; value: string }[] | null {
  const record = getUnknownRecord(value);
  if (
    !record ||
    typeof record.fullName !== "string" ||
    typeof record.faculty !== "string" ||
    typeof record.direction !== "string" ||
    typeof record.course !== "number" ||
    typeof record.groupName !== "string"
  ) {
    return null;
  }

  const studyFormLabels: Record<string, string> = {
    FULL_TIME: "очная",
    PART_TIME: "очно-заочная",
    CORRESPONDENCE: "заочная",
  };
  const studyForm =
    typeof record.studyForm === "string"
      ? (studyFormLabels[record.studyForm] ?? record.studyForm)
      : "не указана";

  return [
    { label: "ФИО", value: record.fullName },
    { label: "Факультет", value: record.faculty },
    { label: "Направление", value: record.direction },
    { label: "Группа", value: record.groupName },
    { label: "Курс", value: String(record.course) },
    {
      label: "Номер зачётной книжки",
      value:
        typeof record.recordBookNumber === "string"
          ? record.recordBookNumber
          : "не указан",
    },
    { label: "Форма обучения", value: studyForm },
  ];
}

export function isRequestCatalogCode(
  code: string,
): code is RequestCatalogCode {
  return requestCatalog.some((entry) => entry.code === code && entry.active);
}

export function validateRequestCatalogField(
  value: unknown,
): RequestCatalogField | null {
  return parseRequestCatalogField(value);
}

function getUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return Object.fromEntries(Object.entries(value));
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseRequestCatalogField(value: unknown): RequestCatalogField | null {
  const record = getUnknownRecord(value);
  if (
    !record ||
    typeof record.id !== "string" ||
    !/^[a-z][A-Za-z0-9_]{0,39}$/.test(record.id) ||
    typeof record.label !== "string" ||
    !record.label.trim() ||
    record.label.length > 120 ||
    typeof record.required !== "boolean" ||
    (record.hint !== undefined &&
      (typeof record.hint !== "string" || record.hint.length > 200))
  ) {
    return null;
  }

  const hint = typeof record.hint === "string" ? record.hint.trim() : "";
  const base = {
    id: record.id,
    label: record.label.trim(),
    required: record.required,
    ...(hint ? { hint } : {}),
  };

  if (record.kind === "checkbox" || record.kind === "file") {
    return { ...base, kind: record.kind };
  }

  if (record.kind === "number") {
    const min = parseOptionalNumber(record.min);
    const max = parseOptionalNumber(record.max);
    if (
      min === null ||
      max === null ||
      (min !== undefined && max !== undefined && min > max)
    ) {
      return null;
    }
    return {
      ...base,
      kind: "number",
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
    };
  }

  if (record.kind === "text" || record.kind === "date") {
    if (
      record.maxLength !== undefined &&
      (typeof record.maxLength !== "number" ||
        !Number.isSafeInteger(record.maxLength) ||
        record.maxLength < 1 ||
        record.maxLength > 2000)
    ) {
      return null;
    }
    return {
      ...base,
      kind: record.kind,
      ...(typeof record.maxLength === "number"
        ? { maxLength: record.maxLength }
        : {}),
    };
  }

  if (record.kind === "select" && Array.isArray(record.options)) {
    const options: { value: string; label: string }[] = [];
    for (const optionValue of record.options) {
      const option = getUnknownRecord(optionValue);
      if (
        !option ||
        typeof option.value !== "string" ||
        !/^[A-Z0-9_-]{1,40}$/.test(option.value) ||
        typeof option.label !== "string" ||
        !option.label.trim() ||
        option.label.length > 120
      ) {
        return null;
      }
      options.push({ value: option.value, label: option.label.trim() });
    }
    if (
      options.length < 1 ||
      options.length > 30 ||
      new Set(options.map((option) => option.value)).size !== options.length
    ) {
      return null;
    }
    return { ...base, kind: "select", options };
  }

  return null;
}

function getStringRecord(value: unknown): Record<string, string> | null {
  const record = getUnknownRecord(value);
  if (!record) {
    return null;
  }

  const entries: [string, string][] = [];
  for (const [key, entryValue] of Object.entries(record)) {
    if (typeof entryValue !== "string") {
      return null;
    }
    entries.push([key, entryValue]);
  }
  return Object.fromEntries(entries);
}

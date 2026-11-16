import type { RequestType } from "@/generated/prisma/enums";

export type RequestCatalogField =
  | {
      id: string;
      label: string;
      kind: "text" | "date";
      required: true;
      maxLength?: number;
    }
  | {
      id: string;
      label: string;
      kind: "select";
      required: true;
      options: readonly { value: string; label: string }[];
    };

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

export type RequestCatalogEntry = (typeof requestCatalog)[number];
export type RequestCatalogCode = RequestCatalogEntry["code"];

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
): RequestCatalogEntry | undefined {
  return requestCatalog.find((entry) => entry.code === code && entry.active);
}

export function getRequestCatalogTitle(
  code: string | null | undefined,
  fallback: string,
): string {
  return getRequestCatalogEntry(code)?.title ?? fallback;
}

export function getRequestFieldEntries(
  code: string | null | undefined,
  value: unknown,
): { id: string; label: string; value: string }[] {
  const service = getRequestCatalogEntry(code);
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
        : rawValue;
    return [{ id: field.id, label: field.label, value: displayValue }];
  });
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

function getUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return Object.fromEntries(Object.entries(value));
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

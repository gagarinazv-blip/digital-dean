import type {
  OpportunityCost,
  OpportunityDirection,
  OpportunityFormat,
  OpportunityStatus,
  OpportunityType,
} from "@/generated/prisma/enums";
import {
  opportunityDirections,
  opportunityTypeConfig,
  opportunityTypes,
  validateOpportunityDetails,
  type OpportunityDetails,
} from "@/lib/opportunity-catalog";

type Requirement = { key: string; title: string; required: boolean };

export type OpportunityFormValue = {
  title: string;
  type: OpportunityType;
  organizer: string;
  shortDescription: string;
  description: string;
  requirements: string;
  deadline: Date;
  allowLateRequests: boolean;
  lateRequestsUntil: Date | null;
  directions: OpportunityDirection[];
  minCourse: number | null;
  maxCourse: number | null;
  allowedFaculties: string[];
  format: OpportunityFormat;
  location: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  cost: OpportunityCost;
  costNote: string | null;
  officialUrl: string | null;
  requiredDocuments: Requirement[];
  details: OpportunityDetails;
  status: OpportunityStatus;
};

export type OpportunityFormResult =
  | { ok: true; value: OpportunityFormValue }
  | { ok: false; errors: string[] };

function stringValue(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseMoscowDate(value: string): Date | null {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)
    ? `${value}+03:00`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNullableInteger(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function isHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function parseRequiredDocuments(
  value: string,
): Requirement[] | null {
  if (!value) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > 10) return null;
  const documents: Requirement[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (
      typeof record.key !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(record.key) ||
      typeof record.title !== "string" ||
      record.title.trim().length < 1 ||
      record.title.length > 120 ||
      typeof record.required !== "boolean"
    ) {
      return null;
    }
    documents.push({
      key: record.key,
      title: record.title.trim(),
      required: record.required,
    });
  }
  if (new Set(documents.map(({ key }) => key)).size !== documents.length) {
    return null;
  }
  return documents;
}

export function validateOpportunityForm(
  formData: FormData,
  availableFaculties: string[],
): OpportunityFormResult {
  const errors: string[] = [];
  const rawType = stringValue(formData, "type");
  if (!opportunityTypes.some(({ value }) => value === rawType)) {
    return { ok: false, errors: ["Выберите корректный тип возможности."] };
  }
  const type = rawType as OpportunityType;
  const title = stringValue(formData, "title");
  const organizer = stringValue(formData, "organizer");
  const shortDescription = stringValue(formData, "shortDescription");
  const description = stringValue(formData, "description");
  const requirements = stringValue(formData, "requirements");
  const deadline = parseMoscowDate(stringValue(formData, "deadline"));
  const lateRequestsUntilRaw = stringValue(formData, "lateRequestsUntil");
  const lateRequestsUntil = lateRequestsUntilRaw
    ? parseMoscowDate(lateRequestsUntilRaw)
    : null;
  const minCourse = parseNullableInteger(stringValue(formData, "minCourse"));
  const maxCourse = parseNullableInteger(stringValue(formData, "maxCourse"));
  const allowedFacultyValues = formData
    .getAll("allowedFaculties")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedFaculties = [...new Set(allowedFacultyValues)];
  const directions = formData
    .getAll("directions")
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is OpportunityDirection =>
      opportunityDirections.some((direction) => direction.value === value),
    );
  const format = stringValue(formData, "format");
  const cost = stringValue(formData, "cost");
  const officialUrl = stringValue(formData, "officialUrl");
  const location = stringValue(formData, "location");
  const startsAtRaw = stringValue(formData, "startsAt");
  const endsAtRaw = stringValue(formData, "endsAt");
  const startsAt = startsAtRaw ? parseMoscowDate(startsAtRaw) : null;
  const endsAt = endsAtRaw ? parseMoscowDate(endsAtRaw) : null;
  const costNote = stringValue(formData, "costNote");
  const status = stringValue(formData, "status");
  const requiredDocuments = parseRequiredDocuments(
    stringValue(formData, "requiredDocuments"),
  );
  const detailInput: Record<string, unknown> = {};
  for (const field of opportunityTypeConfig[type].fields) {
    const value = formData.get(`detail_${field.name}`);
    detailInput[field.name] = typeof value === "string" ? value : "";
  }
  const detailResult = validateOpportunityDetails(type, detailInput);

  if (title.length < 1 || title.length > 120) errors.push("Название: от 1 до 120 символов.");
  if (organizer.length < 1 || organizer.length > 160) errors.push("Укажите организатора (до 160 символов).");
  if (shortDescription.length > 200) errors.push("Краткое описание: не более 200 символов.");
  if (description.length < 1 || description.length > 10000) errors.push("Описание: от 1 до 10000 символов.");
  if (requirements.length < 1 || requirements.length > 5000) errors.push("Требования: от 1 до 5000 символов.");
  if (!deadline) errors.push("Укажите корректный дедлайн.");
  if (lateRequestsUntilRaw && !lateRequestsUntil) errors.push("Укажите корректную дату окончания индивидуальных запросов.");
  if (lateRequestsUntil && deadline && lateRequestsUntil < deadline) errors.push("Срок индивидуальных запросов не может быть раньше дедлайна.");
  if (Number.isNaN(minCourse) || (minCourse !== null && (minCourse < 1 || minCourse > 6))) errors.push("Минимальный курс должен быть от 1 до 6.");
  if (Number.isNaN(maxCourse) || (maxCourse !== null && (maxCourse < 1 || maxCourse > 6))) errors.push("Максимальный курс должен быть от 1 до 6.");
  if (minCourse !== null && maxCourse !== null && minCourse > maxCourse) errors.push("Минимальный курс не может быть выше максимального.");
  if (allowedFaculties.some((faculty) => !availableFaculties.includes(faculty))) errors.push("Выбран неизвестный факультет.");
  if (!["OFFLINE", "ONLINE", "HYBRID"].includes(format)) errors.push("Выберите формат.");
  if (!["FREE", "PAID"].includes(cost)) errors.push("Выберите стоимость.");
  if (location.length > 160) errors.push("Место проведения: не более 160 символов.");
  if (costNote.length > 200) errors.push("Пояснение стоимости: не более 200 символов.");
  if (!isHttpUrl(officialUrl) || officialUrl.length > 2048) errors.push("Ссылка должна использовать HTTP или HTTPS.");
  if (startsAtRaw && !startsAt) errors.push("Укажите корректное время начала.");
  if (endsAtRaw && !endsAt) errors.push("Укажите корректное время окончания.");
  if (startsAt && endsAt && endsAt <= startsAt) errors.push("Время окончания должно быть позже времени начала.");
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) errors.push("Выберите корректный статус.");
  if (!requiredDocuments) errors.push("Проверьте список необходимых документов.");
  if (Object.keys(detailResult.errors).length > 0) {
    errors.push(...Object.values(detailResult.errors));
  }

  if (errors.length > 0 || !deadline || requiredDocuments === null) {
    return { ok: false, errors };
  }

  const allowLateRequestsValues = formData.getAll("allowLateRequests");
  const allowLateRequests = allowLateRequestsValues.length > 0
    ? allowLateRequestsValues.includes("true")
    : type === "SPORT";

  return {
    ok: true,
    value: {
      title,
      type,
      organizer,
      shortDescription,
      description,
      requirements,
      deadline,
      allowLateRequests,
      lateRequestsUntil,
      directions,
      minCourse: minCourse === null ? null : minCourse,
      maxCourse: maxCourse === null ? null : maxCourse,
      allowedFaculties,
      format: format as OpportunityFormat,
      location: location || null,
      startsAt,
      endsAt,
      cost: cost as OpportunityCost,
      costNote: costNote || null,
      officialUrl: officialUrl || null,
      requiredDocuments,
      details: detailResult.details,
      status: status as OpportunityStatus,
    },
  };
}

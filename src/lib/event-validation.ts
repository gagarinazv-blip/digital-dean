import type { EventStatus, EventType } from "@/generated/prisma/enums";
import { getMoscowDateTime } from "@/lib/campus-time";
import {
  isEventStatus,
  isEventType,
} from "@/lib/event-constants";

export type EventFormField =
  | "title"
  | "type"
  | "description"
  | "date"
  | "startsAt"
  | "endsAt"
  | "location"
  | "host"
  | "registrationUrl"
  | "status";

export type EventInput = {
  title: string;
  type: EventType;
  description: string | null;
  eventDate: Date;
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
  host: string | null;
  registrationUrl: string | null;
  status: EventStatus;
};

export type EventValidationResult =
  | { ok: true; value: EventInput }
  | {
      ok: false;
      fieldErrors: Partial<Record<EventFormField, string>>;
    };

export type EventActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<EventFormField, string>>;
};

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function parseTime(value: string): { date: Date; minutes: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return {
    date: new Date(`1970-01-01T${value}:00.000Z`),
    minutes: hours * 60 + minutes,
  };
}

function parseEventUrl(value: string): string | null | undefined {
  if (!value) return null;
  if (value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function parseEventInput(
  input: Record<string, unknown>,
): EventValidationResult {
  const fieldErrors: Partial<Record<EventFormField, string>> = {};
  const title = getString(input.title);
  const typeValue = input.type;
  const description = getString(input.description);
  const dateValue = getString(input.date);
  const startsAtValue = getString(input.startsAt);
  const endsAtValue = getString(input.endsAt);
  const location = getString(input.location);
  const host = getString(input.host);
  const registrationUrlValue = getString(input.registrationUrl);
  const statusValue = input.status;

  if (!title || title.length > 120) {
    fieldErrors.title = "Название обязательно (до 120 символов).";
  }
  if (!isEventType(typeValue)) {
    fieldErrors.type = "Выберите тип события.";
  }
  if (description.length > 1000) {
    fieldErrors.description = "Описание — не более 1000 символов.";
  }
  // Черновик можно завести заранее: время, аудитория и спикер ещё согласуются.
  const isDraft = statusValue === "DRAFT";
  if ((!location && !isDraft) || location.length > 160) {
    fieldErrors.location = "Укажите аудиторию (до 160 символов).";
  }
  if ((!host && !isDraft) || host.length > 160) {
    fieldErrors.host = "Укажите спикера или ведущего (до 160 символов).";
  }
  if (
    !isEventStatus(statusValue)
  ) {
    fieldErrors.status = "Выберите статус события.";
  }

  const calendarDate = parseCalendarDate(dateValue);
  const startTime = parseTime(startsAtValue);
  const endTime = parseTime(endsAtValue);
  if (!calendarDate) fieldErrors.date = "Укажите корректную дату.";
  const isTimeOpen = isDraft && !startsAtValue && !endsAtValue;
  if (!startTime && !isTimeOpen) {
    fieldErrors.startsAt = "Укажите корректное время начала.";
  }
  if (!endTime && !isTimeOpen) {
    fieldErrors.endsAt = "Укажите корректное время окончания.";
  }

  const registrationUrl = parseEventUrl(registrationUrlValue);
  if (registrationUrl === undefined) {
    fieldErrors.registrationUrl =
      "Укажите ссылку с протоколом http:// или https://.";
  }

  if (
    calendarDate &&
    startTime &&
    endTime &&
    startTime.minutes === endTime.minutes
  ) {
    fieldErrors.endsAt = "Время окончания должно отличаться от начала.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  if (
    !calendarDate ||
    (!isTimeOpen && (!startTime || !endTime)) ||
    !isEventType(typeValue) ||
    !isEventStatus(statusValue)
  ) {
    return {
      ok: false,
      fieldErrors: { date: "Проверьте дату и время события." },
    };
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  if (startTime && endTime) {
    const endDate = new Date(calendarDate);
    if (endTime.minutes < startTime.minutes) {
      endDate.setUTCDate(endDate.getUTCDate() + 1);
    }
    startsAt = getMoscowDateTime(calendarDate, startTime.date);
    endsAt = getMoscowDateTime(endDate, endTime.date);
  }

  return {
    ok: true,
    value: {
      title,
      type: typeValue,
      description: description || null,
      eventDate: calendarDate,
      startsAt,
      endsAt,
      location: location || null,
      host: host || null,
      registrationUrl: registrationUrl ?? null,
      status: statusValue,
    },
  };
}

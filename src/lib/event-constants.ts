import type { EventStatus, EventType } from "@/generated/prisma/enums";

export const eventTypeValues = [
  "CONFERENCE",
  "SPEAKER_MEETING",
  "MASTER_CLASS",
  "OTHER",
] as const satisfies readonly EventType[];

export const eventStatusValues = ["DRAFT", "PUBLISHED"] as const satisfies
  readonly EventStatus[];

export const eventTypeLabels: Record<EventType, string> = {
  CONFERENCE: "Конференция",
  SPEAKER_MEETING: "Встреча со спикером",
  MASTER_CLASS: "Мастер-класс",
  OTHER: "Другое",
};

export const eventStatusLabels: Record<EventStatus, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
};

export function isEventType(value: unknown): value is EventType {
  return (
    typeof value === "string" &&
    eventTypeValues.some((eventType) => eventType === value)
  );
}

export function isEventStatus(value: unknown): value is EventStatus {
  return (
    typeof value === "string" &&
    eventStatusValues.some((eventStatus) => eventStatus === value)
  );
}

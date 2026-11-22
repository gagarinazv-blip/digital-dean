import type { DeadlineFormat } from "@/generated/prisma/enums";

export type DeadlineAction =
  | { kind: "open-task"; href: string }
  | { kind: "calendar" }
  | { kind: "none" };

export function getSafeExternalUrl(value: string | null): string | null {
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" || url.protocol === "http:"
    ? url.href
    : null;
}

export function getDeadlineAction(
  format: DeadlineFormat,
  taskUrl: string | null,
): DeadlineAction {
  if (format !== "ONLINE") return { kind: "calendar" };
  const href = getSafeExternalUrl(taskUrl);
  return href ? { kind: "open-task", href } : { kind: "none" };
}

export function getDeadlineHref(deadlineId: string): string {
  return `/deadlines/${encodeURIComponent(deadlineId)}`;
}

export function getDeadlineCalendarHref(
  deadlineId: string,
  withReminder = false,
): string {
  return `/api/deadlines/${encodeURIComponent(deadlineId)}/calendar${
    withReminder ? "?reminder=1" : ""
  }`;
}

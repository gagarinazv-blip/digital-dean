import type {
  EventApprovalItem,
  EventApprovalStatus,
  EventStatus,
} from "@/generated/prisma/enums";

export const approvalItems = ["SPEAKER", "ROOM", "TIME"] as const satisfies
  readonly EventApprovalItem[];

/** Статусы, которые сотрудник выбирает; NOT_REQUIRED остаётся у старых записей. */
export const approvalStatuses = ["NOT_APPROVED", "PENDING", "APPROVED"] as const satisfies
  readonly EventApprovalStatus[];

export type SelectableApprovalStatus = (typeof approvalStatuses)[number];

export const approvalItemLabels: Record<EventApprovalItem, string> = {
  SPEAKER: "Спикер",
  ROOM: "Аудитория",
  TIME: "Время",
};

const statusLabels: Record<
  EventApprovalItem,
  Record<EventApprovalStatus, string>
> = {
  SPEAKER: {
    NOT_APPROVED: "не согласован",
    PENDING: "согласовывается",
    APPROVED: "согласован",
    NOT_REQUIRED: "не требуется",
  },
  ROOM: {
    NOT_APPROVED: "не согласована",
    PENDING: "согласовывается",
    APPROVED: "согласована",
    NOT_REQUIRED: "не требуется",
  },
  TIME: {
    NOT_APPROVED: "не согласовано",
    PENDING: "согласовывается",
    APPROVED: "согласовано",
    NOT_REQUIRED: "не требуется",
  },
};

const missingLabels: Record<EventApprovalItem, string> = {
  SPEAKER: "укажите спикера",
  ROOM: "укажите аудиторию",
  TIME: "укажите время",
};

export function isApprovalItem(value: unknown): value is EventApprovalItem {
  return approvalItems.some((item) => item === value);
}

export function isSelectableApprovalStatus(
  value: unknown,
): value is SelectableApprovalStatus {
  return approvalStatuses.some((status) => status === value);
}

/** «согласована», «согласовывается» — в роде самого пункта. */
export function getApprovalStatusLabel(
  item: EventApprovalItem,
  status: EventApprovalStatus,
): string {
  return statusLabels[item][status];
}

/** «Аудитория согласовывается». */
export function getApprovalLabel(
  item: EventApprovalItem,
  status: EventApprovalStatus,
): string {
  return `${approvalItemLabels[item]} ${statusLabels[item][status]}`;
}

export type EventApprovalData = {
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
  host: string | null;
  speakerApproval: EventApprovalStatus;
  roomApproval: EventApprovalStatus;
  timeApproval: EventApprovalStatus;
};

export function getApprovalStatus(
  event: EventApprovalData,
  item: EventApprovalItem,
): EventApprovalStatus {
  return item === "SPEAKER"
    ? event.speakerApproval
    : item === "ROOM"
      ? event.roomApproval
      : event.timeApproval;
}

export function hasApprovalValue(
  event: Pick<EventApprovalData, "startsAt" | "endsAt" | "location" | "host">,
  item: EventApprovalItem,
): boolean {
  return item === "SPEAKER"
    ? Boolean(event.host?.trim())
    : item === "ROOM"
      ? Boolean(event.location?.trim())
      : Boolean(event.startsAt && event.endsAt);
}

/** Что мешает показать событие студентам. Пустой список — можно публиковать. */
export function getPublicationBlockers(event: EventApprovalData): string[] {
  return approvalItems.flatMap((item) => {
    // Студентам всегда нужны время, место и ведущий.
    if (!hasApprovalValue(event, item)) return [missingLabels[item]];
    const status = getApprovalStatus(event, item);
    if (status === "APPROVED") return [];
    if (status === "NOT_REQUIRED" && item !== "TIME") return [];
    return [getApprovalLabel(item, status).toLocaleLowerCase("ru-RU")];
  });
}

/** После правки данных старое согласование больше не действует. */
export function getStatusAfterChange(
  current: EventApprovalStatus,
  submitted: EventApprovalStatus,
  isChanged: boolean,
): EventApprovalStatus {
  return isChanged && submitted === current && current === "APPROVED"
    ? "PENDING"
    : submitted;
}

export type DigestState = "empty" | "draft" | "partial" | "published";

export const digestStateLabels: Record<DigestState, string> = {
  empty: "Пока пусто",
  draft: "Черновик",
  partial: "Опубликован частично",
  published: "Опубликован",
};

/** Состояние дайджеста недели складывается из состояний его событий. */
export function getDigestState(
  events: readonly { status: EventStatus }[],
): DigestState {
  const published = events.filter((event) => event.status === "PUBLISHED").length;
  if (events.length === 0) return "empty";
  if (published === 0) return "draft";
  return published === events.length ? "published" : "partial";
}

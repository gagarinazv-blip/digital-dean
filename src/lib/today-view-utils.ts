import type { RequestStatus, ScheduleStatus } from "@/generated/prisma/enums";
import { getCalendarDayDifference } from "@/lib/date-stack";

const EXAM_WINDOW = 48 * 60 * 60 * 1000;

export type TodayEvent = {
  id: string;
  kind: "lesson" | "session";
  title: string;
  typeLabel: string;
  startsAt: Date;
  endsAt: Date;
  originalStartsAt: Date | null;
  originalEndsAt: Date | null;
  status: ScheduleStatus;
  room: string | null;
  teacher: string | null;
  onlineUrl: string | null;
  scheduleHref: string;
  detailsHref: string;
};

export type TodayFocusState =
  | "current"
  | "today"
  | "upcoming"
  | "cancelled"
  | "none";

export type TodayFocus = {
  state: TodayFocusState;
  main: TodayEvent | null;
  /** Экзамен или зачёт для полосы «Далее»: ближайшие 48 часов или сразу следом. */
  next: TodayEvent | null;
  isNextUrgent: boolean;
  isOverlapping: boolean;
};

function byStart(first: TodayEvent, second: TodayEvent): number {
  return (
    first.startsAt.getTime() - second.startsAt.getTime() ||
    // При одинаковом начале экзамен важнее пары.
    Number(second.kind === "session") - Number(first.kind === "session") ||
    first.id.localeCompare(second.id)
  );
}

export function doEventsOverlap(
  first: Pick<TodayEvent, "startsAt" | "endsAt">,
  second: Pick<TodayEvent, "startsAt" | "endsAt">,
): boolean {
  return (
    first.startsAt.getTime() < second.endsAt.getTime() &&
    second.startsAt.getTime() < first.endsAt.getTime()
  );
}

/** Что показать главной карточкой «Ближайшее занятие». */
export function getTodayFocus(
  events: readonly TodayEvent[],
  now: Date,
): TodayFocus {
  const remaining = events
    .filter((event) => event.endsAt.getTime() > now.getTime())
    .sort(byStart);
  const active = remaining.filter((event) => event.status !== "CANCELLED");
  const running = active.filter(
    (event) => event.startsAt.getTime() <= now.getTime(),
  );
  const isToday = (event: TodayEvent) =>
    getCalendarDayDifference(event.startsAt, now) === 0;

  let main =
    running.find((event) => event.kind === "session") ??
    running[0] ??
    active[0] ??
    null;
  let state: TodayFocusState =
    main === null
      ? "none"
      : running.length > 0
        ? "current"
        : isToday(main)
          ? "today"
          : "upcoming";

  // На сегодня остались только отменённые пары — сообщаем об отмене.
  const cancelledToday = remaining.find(
    (event) => event.status === "CANCELLED" && isToday(event),
  );
  if (cancelledToday && state !== "current" && state !== "today") {
    main = cancelledToday;
    state = "cancelled";
  }

  const following = active.filter(
    (event) =>
      event.id !== main?.id &&
      event.startsAt.getTime() >= (main?.startsAt.getTime() ?? 0),
  );
  const session = active.find(
    (event) => event.kind === "session" && event.id !== main?.id,
  );
  const isNextUrgent = Boolean(
    session && session.startsAt.getTime() - now.getTime() < EXAM_WINDOW,
  );
  const next =
    main && session && (isNextUrgent || following[0]?.id === session.id)
      ? session
      : null;

  return {
    state,
    main,
    next,
    isNextUrgent: next !== null && isNextUrgent,
    isOverlapping: Boolean(
      main && next && state !== "cancelled" && doEventsOverlap(main, next),
    ),
  };
}

/** Список «Ближайшие занятия» без пары из главной карточки. */
export function getLessonsAfterFocus(
  events: readonly TodayEvent[],
  focus: Pick<TodayFocus, "main">,
  now: Date,
): TodayEvent[] {
  return events
    .filter(
      (event) =>
        event.kind === "lesson" &&
        event.id !== focus.main?.id &&
        event.endsAt.getTime() > now.getTime(),
    )
    .sort(byStart);
}

export type RequestStatusTone =
  | "new"
  | "inProgress"
  | "needsInfo"
  | "ready"
  | "rejected"
  | "cancelled";

export function getRequestStatusTone(
  status: RequestStatus,
): RequestStatusTone {
  switch (status) {
    case "NEW":
      return "new";
    case "IN_PROGRESS":
      return "inProgress";
    case "NEEDS_INFO":
      return "needsInfo";
    case "READY":
      return "ready";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
      return "cancelled";
  }
}

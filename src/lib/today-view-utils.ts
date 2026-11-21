import type { RequestStatus, ScheduleStatus } from "@/generated/prisma/enums";

type TimedLesson = {
  startTime: Date;
  endTime: Date;
  status: ScheduleStatus;
};

export type TodayHeroState<T extends TimedLesson> = {
  kind: "current" | "next" | "upcoming" | "none";
  lesson: T | null;
  hasTodayLessons: boolean;
  countdown: string | null;
};

function formatDuration(milliseconds: number): string | null {
  if (milliseconds <= 0) return null;
  const totalMinutes = Math.ceil(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} ч ${minutes} мин`;
  if (hours > 0) return `${hours} ч`;
  return `${totalMinutes} мин`;
}

export function getTodayHeroState<T extends TimedLesson>(
  todayLessons: readonly T[],
  nearestLesson: T | null,
  now: Date,
): TodayHeroState<T> {
  const activeTodayLessons = todayLessons.filter(
    (lesson) => lesson.status !== "CANCELLED",
  );
  const currentLesson = activeTodayLessons.find(
    (lesson) =>
      lesson.startTime.getTime() <= now.getTime() &&
      lesson.endTime.getTime() > now.getTime(),
  );
  if (currentLesson) {
    const remaining = formatDuration(
      currentLesson.endTime.getTime() - now.getTime(),
    );
    return {
      kind: "current",
      lesson: currentLesson,
      hasTodayLessons: activeTodayLessons.length > 0,
      countdown: remaining ? `осталось ${remaining}` : null,
    };
  }

  const nextTodayLesson = activeTodayLessons
    .filter((lesson) => lesson.startTime.getTime() > now.getTime())
    .sort(
      (first, second) =>
        first.startTime.getTime() - second.startTime.getTime(),
    )[0];
  if (nextTodayLesson) {
    const remaining = formatDuration(
      nextTodayLesson.startTime.getTime() - now.getTime(),
    );
    return {
      kind: "next",
      lesson: nextTodayLesson,
      hasTodayLessons: true,
      countdown: remaining ? `через ${remaining}` : null,
    };
  }

  if (nearestLesson) {
    const remaining = formatDuration(
      nearestLesson.startTime.getTime() - now.getTime(),
    );
    return {
      kind: "upcoming",
      lesson: nearestLesson,
      hasTodayLessons: activeTodayLessons.length > 0,
      countdown: remaining ? `через ${remaining}` : null,
    };
  }

  return {
    kind: "none",
    lesson: null,
    hasTodayLessons: activeTodayLessons.length > 0,
    countdown: null,
  };
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

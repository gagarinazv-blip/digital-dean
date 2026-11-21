import "server-only";

import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import {
  getMoscowDateKey,
  getMoscowDayRange,
  getMoscowMonthRange,
  getMoscowDateTimeOnDate,
  getMoscowWeekRange,
  getMoscowDateTime,
} from "@/lib/campus-time";
import type {
  ScheduleKind,
  ScheduleStatus,
} from "@/generated/prisma/enums";

export type ScheduleRange = "today" | "week" | "month";

export type ScheduleLesson = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  originalStartsAt: Date | null;
  originalEndsAt: Date | null;
  originalRoom: string | null;
  kind: ScheduleKind;
  status: ScheduleStatus;
  room: string;
  teacher: string;
  changeNote: string | null;
  subject: string;
};

export type ScheduleDay = {
  dateKey: string;
  lessons: ScheduleLesson[];
};

export type ScheduleOptions = {
  date?: string | string[];
  now?: Date;
  allowDateOverride?: boolean;
};

function getReferenceDate(
  date: string | string[] | undefined,
  now: Date,
  allowDateOverride: boolean,
): Date {
  if (
    (process.env.NODE_ENV === "production" && !allowDateOverride) ||
    date === undefined
  ) {
    return now;
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError("Параметр date должен иметь формат ГГГГ-ММ-ДД.");
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError("Параметр date содержит некорректную дату.");
  }

  return parsedDate;
}

function compareLessons(first: ScheduleLesson, second: ScheduleLesson) {
  return (
    first.startsAt.getTime() - second.startsAt.getTime() ||
    first.id.localeCompare(second.id)
  );
}

export function groupScheduleLessonsByDay(
  lessons: readonly ScheduleLesson[],
): ScheduleDay[] {
  const groups = new Map<string, ScheduleLesson[]>();
  for (const lesson of [...lessons].sort(compareLessons)) {
    const dateKey = getMoscowDateKey(lesson.startsAt);
    const dayLessons = groups.get(dateKey) ?? [];
    dayLessons.push(lesson);
    groups.set(dateKey, dayLessons);
  }

  return Array.from(groups, ([dateKey, dayLessons]) => ({
    dateKey,
    lessons: dayLessons,
  }));
}

export function getNextScheduleLesson(
  lessons: readonly ScheduleLesson[],
  now = new Date(),
): ScheduleLesson | null {
  return (
    [...lessons]
      .filter(
        (lesson) =>
          lesson.status !== "CANCELLED" &&
          lesson.startsAt.getTime() >= now.getTime(),
      )
      .sort(compareLessons)[0] ?? null
  );
}

export async function getScheduleForGroup(
  groupId: number,
  range: ScheduleRange,
  options: ScheduleOptions = {},
) {
  const now = options.now ?? new Date();
  const referenceDate = getReferenceDate(
    options.date,
    now,
    options.allowDateOverride ?? false,
  );
  const referenceNow =
    (process.env.NODE_ENV !== "production" ||
      options.allowDateOverride === true) &&
    options.date !== undefined
      ? getMoscowDateTimeOnDate(referenceDate, now)
      : now;
  const period =
    range === "today"
      ? getMoscowDayRange(referenceDate)
      : range === "month"
        ? getMoscowMonthRange(referenceDate)
        : getMoscowWeekRange(referenceDate);
  const records = await getPrisma().scheduleItem.findMany({
    where: {
      groupId,
      OR: [
        { startsAt: { gte: period.startInstant, lt: period.endInstant } },
        {
          startsAt: null,
          date: { gte: period.startDate, lt: period.endDate },
        },
        {
          startsAt: null,
          date: null,
          weekday: { in: period.weekdays },
        },
      ],
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      date: true,
      weekday: true,
      startTime: true,
      endTime: true,
      startsAt: true,
      endsAt: true,
      originalStartsAt: true,
      originalEndsAt: true,
      originalRoom: true,
      kind: true,
      status: true,
      room: true,
      teacher: true,
      changeNote: true,
      subject: { select: { name: true } },
    },
  });

  const lessons: ScheduleLesson[] = [];

  for (const record of records) {
    if (record.startsAt) {
      const dateKey = getMoscowDateKey(record.startsAt);
      const date = new Date(`${dateKey}T00:00:00.000Z`);
      lessons.push({
        id: `${record.id}-${dateKey}`,
        startsAt: record.startsAt,
        endsAt:
          record.endsAt ?? getMoscowDateTime(date, record.endTime),
        originalStartsAt: record.originalStartsAt,
        originalEndsAt: record.originalEndsAt,
        originalRoom: record.originalRoom,
        kind: record.kind,
        status: record.status,
        room: record.room,
        teacher: record.teacher,
        changeNote: record.changeNote,
        subject: record.subject.name,
      });
      continue;
    }

    const addLegacyOccurrence = (date: Date) => {
      const dateKey = date.toISOString().slice(0, 10);
      lessons.push({
        id: `${record.id}-${dateKey}`,
        startsAt: getMoscowDateTime(date, record.startTime),
        endsAt: getMoscowDateTime(date, record.endTime),
        originalStartsAt: record.originalStartsAt,
        originalEndsAt: record.originalEndsAt,
        originalRoom: record.originalRoom,
        kind: record.kind,
        status: record.status,
        room: record.room,
        teacher: record.teacher,
        changeNote: record.changeNote,
        subject: record.subject.name,
      });
    };

    if (record.date) {
      addLegacyOccurrence(record.date);
      continue;
    }

    if (record.weekday) {
      for (
        let dayOffset = 0;
        dayOffset < period.weekdays.length;
        dayOffset += 1
      ) {
        if (period.weekdays[dayOffset] !== record.weekday) continue;

        const date = new Date(period.startDate);
        date.setUTCDate(date.getUTCDate() + dayOffset);
        addLegacyOccurrence(date);
      }
    }
  }

  lessons.sort(compareLessons);

  return {
    todayKey: period.todayKey,
    startDate: period.startDate,
    endDate: period.endDate,
    referenceNow,
    lessons,
    groupedLessons: groupScheduleLessonsByDay(lessons),
  };
}

export async function getScheduleForStudent(
  range: ScheduleRange,
  options: ScheduleOptions = {},
) {
  const student = await requireStudent();
  const schedule = await getScheduleForGroup(
    student.group.id,
    range,
    options,
  );
  return {
    groupName: student.group.name,
    ...schedule,
  };
}

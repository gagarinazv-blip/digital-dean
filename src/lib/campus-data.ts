import "server-only";

import type { Weekday } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import {
  getMoscowWeek,
  getTimeMinutes,
} from "@/lib/campus-time";

const weekdayByUtcDay: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

type ScheduleRecord = {
  id: number;
  date: Date | null;
  weekday: Weekday | null;
  startTime: Date;
  endTime: Date;
  classroom: string;
  teacher: string;
  isRescheduled: boolean;
  comment: string | null;
  subject: { name: string };
};

function expandSchedule(
  records: ScheduleRecord[],
  startDate: Date,
): Array<ScheduleRecord & { occurrenceDate: Date; occurrenceId: string }> {
  const occurrences: Array<
    ScheduleRecord & { occurrenceDate: Date; occurrenceId: string }
  > = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const occurrenceDate = new Date(startDate);
    occurrenceDate.setUTCDate(occurrenceDate.getUTCDate() + dayOffset);
    const dateKey = occurrenceDate.toISOString().slice(0, 10);
    const weekday = weekdayByUtcDay[occurrenceDate.getUTCDay()];

    for (const record of records) {
      const happensOnDate = record.date
        ? record.date.toISOString().slice(0, 10) === dateKey
        : record.weekday === weekday;
      if (happensOnDate) {
        occurrences.push({
          ...record,
          occurrenceDate,
          occurrenceId: `${record.id}-${dateKey}`,
        });
      }
    }
  }

  return occurrences.sort((first, second) => {
    const dateDifference =
      first.occurrenceDate.getTime() - second.occurrenceDate.getTime();
    return (
      dateDifference ||
      getTimeMinutes(first.startTime) - getTimeMinutes(second.startTime)
    );
  });
}

export async function getStudentSchedule(
  groupId: number,
  now = new Date(),
) {
  const week = getMoscowWeek(now);
  const records = await getPrisma().scheduleItem.findMany({
    where: {
      groupId,
      OR: [
        { date: { gte: week.startDate, lt: week.endDate } },
        { weekday: { in: week.weekdays } },
      ],
    },
    select: {
      id: true,
      date: true,
      weekday: true,
      startTime: true,
      endTime: true,
      classroom: true,
      teacher: true,
      isRescheduled: true,
      comment: true,
      subject: { select: { name: true } },
    },
  });

  return {
    week,
    schedule: expandSchedule(records, week.startDate),
  };
}

export async function getCampusTodayData(now = new Date()) {
  const student = await requireStudent();
  const { week, schedule } = await getStudentSchedule(
    student.group.id,
    now,
  );
  const notificationTarget = {
    OR: [
      { studentId: student.id },
      { groupId: student.group.id },
      { studentId: null, groupId: null },
    ],
  };
  const freshAnnouncementSince = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  );
  const prisma = getPrisma();
  const [
    deadlines,
    announcements,
    requests,
    unreadNotificationCount,
  ] = await Promise.all([
    prisma.notification.findMany({
      where: {
        ...notificationTarget,
        deadline: { gte: now, lt: week.endInstant },
      },
      orderBy: [{ deadline: "asc" }, { id: "asc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        deadline: true,
      },
    }),
    prisma.notification.findMany({
      where: {
        OR: [
          { groupId: student.group.id, studentId: null },
          { groupId: null, studentId: null },
        ],
        date: { gte: freshAnnouncementSince, lte: now },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        text: true,
        date: true,
      },
    }),
    prisma.request.findMany({
      where: { studentId: student.id },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 1,
      select: {
        id: true,
        type: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.notification.count({
      where: { ...notificationTarget, isRead: false },
    }),
  ]);

  const changes = [
    ...schedule
      .filter((item) => item.isRescheduled)
      .map((item) => ({
        id: `schedule-${item.occurrenceId}`,
        kind: "Перенос пары" as const,
        title: item.subject.name,
        text: item.comment ?? "Время занятия изменено.",
        date: item.occurrenceDate,
      })),
    ...announcements.map((announcement) => ({
      id: `announcement-${announcement.id}`,
      kind: "Объявление" as const,
      title: announcement.title,
      text: announcement.text,
      date: announcement.date,
    })),
  ]
    .sort((first, second) => second.date.getTime() - first.date.getTime())
    .slice(0, 3);

  const todaySchedule = schedule.filter(
    (item) => item.occurrenceId.endsWith(week.todayKey),
  );
  const nextLesson = schedule.find((item) => {
    const dateKey = item.occurrenceId.slice(-10);
    return (
      dateKey > week.todayKey ||
      (dateKey === week.todayKey &&
        getTimeMinutes(item.startTime) > week.currentTimeMinutes)
    );
  });

  return {
    student,
    now,
    week,
    todaySchedule,
    nextLesson,
    deadlines,
    changes,
    latestRequest: requests[0] ?? null,
    unreadNotificationCount,
  };
}

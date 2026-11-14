import "server-only";

import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { getMoscowDateKey, getMoscowWeek } from "@/lib/campus-time";
import {
  getNextScheduleLesson,
  getScheduleForGroup,
} from "@/lib/schedule-data";

export async function getCampusTodayData(now = new Date()) {
  const student = await requireStudent();
  const week = getMoscowWeek(now);
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
    scheduleData,
    deadlines,
    announcements,
    requests,
    unreadNotificationCount,
  ] = await Promise.all([
    getScheduleForGroup(student.group.id, "week", { now }),
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

  const schedule = scheduleData.lessons.map((item) => ({
    occurrenceId: item.id,
    occurrenceDate: new Date(
      `${getMoscowDateKey(item.startsAt)}T00:00:00.000Z`,
    ),
    startTime: item.startsAt,
    endTime: item.endsAt,
    room: item.room,
    teacher: item.teacher,
    status: item.status,
    changeNote: item.changeNote,
    subject: { name: item.subject },
  }));

  const changes = [
    ...schedule
      .filter(
        (item) =>
          item.status === "RESCHEDULED" || item.status === "CANCELLED",
      )
      .map((item) => ({
        id: `schedule-${item.occurrenceId}`,
        kind: item.status === "CANCELLED" ? "Отмена пары" : "Перенос пары",
        title: item.subject.name,
        text:
          item.changeNote ??
          (item.status === "CANCELLED"
            ? "Занятие отменено."
            : "Время занятия изменено."),
        date: item.startTime,
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
    (item) => getMoscowDateKey(item.startTime) === week.todayKey,
  );
  let nextScheduleLesson = getNextScheduleLesson(
    scheduleData.lessons,
    now,
  );
  if (!nextScheduleLesson) {
    const nextWeekAnchor = new Date(scheduleData.endDate);
    nextWeekAnchor.setUTCHours(12, 0, 0, 0);
    const nextWeekData = await getScheduleForGroup(
      student.group.id,
      "week",
      { now: nextWeekAnchor },
    );
    nextScheduleLesson = getNextScheduleLesson(nextWeekData.lessons, now);
  }
  const nextLesson = nextScheduleLesson
    ? {
        occurrenceDate: new Date(
          `${getMoscowDateKey(nextScheduleLesson.startsAt)}T00:00:00.000Z`,
        ),
        startTime: nextScheduleLesson.startsAt,
        endTime: nextScheduleLesson.endsAt,
        room: nextScheduleLesson.room,
        teacher: nextScheduleLesson.teacher,
        subject: { name: nextScheduleLesson.subject },
      }
    : null;

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

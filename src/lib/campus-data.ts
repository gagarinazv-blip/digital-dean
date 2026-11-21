import "server-only";

import { getDeadlineCountdown, getNearestDeadlines } from "@/lib/deadline-utils";
import { getDemoNow } from "@/lib/demo-date";
import { countUnreadStudentNotifications } from "@/lib/notification-data";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { getMoscowDateKey, getMoscowWeek } from "@/lib/campus-time";
import {
  getNextScheduleLesson,
  getScheduleForGroup,
} from "@/lib/schedule-data";

export async function getCampusTodayData(now = getDemoNow()) {
  const student = await requireStudent();
  const week = getMoscowWeek(now);
  const freshAnnouncementSince = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  );
  const prisma = getPrisma();
  const [
    scheduleData,
    deadlineRecords,
    announcements,
    requests,
    unreadNotificationCount,
  ] = await Promise.all([
    getScheduleForGroup(student.group.id, "week", { now }),
    prisma.deadline.findMany({
      where: {
        studentId: student.id,
        status: "OPEN",
      },
      orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        subject: true,
        title: true,
        dueAt: true,
        status: true,
        description: true,
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
        publicId: true,
        type: true,
        catalogCode: true,
        status: true,
        updatedAt: true,
      },
    }),
    countUnreadStudentNotifications(student.id),
  ]);

  const deadlines = getNearestDeadlines(deadlineRecords, 5).map((deadline) => ({
    ...deadline,
    countdown: getDeadlineCountdown(deadline.dueAt, now),
  }));
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
  const activeScheduleLesson =
    scheduleData.lessons.find(
      (lesson) =>
        lesson.status !== "CANCELLED" &&
        lesson.startsAt.getTime() <= now.getTime() &&
        lesson.endsAt.getTime() > now.getTime(),
    ) ?? null;
  let nextScheduleLesson =
    activeScheduleLesson ??
    getNextScheduleLesson(scheduleData.lessons, now);
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
        isCurrent:
          activeScheduleLesson?.id === nextScheduleLesson.id,
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

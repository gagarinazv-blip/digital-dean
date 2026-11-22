import "server-only";

import {
  getDeadlineCountdown,
  getUpcomingDeadlines,
} from "@/lib/deadline-utils";
import { getDemoNow } from "@/lib/demo-date";
import { countUnreadStudentNotifications } from "@/lib/notification-data";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { getMoscowDateKey, getMoscowWeek } from "@/lib/campus-time";
import { cleanStudentFacingText } from "@/lib/campus-labels";
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
        formSchemaSnapshot: true,
        status: true,
        updatedAt: true,
      },
    }),
    countUnreadStudentNotifications(student.id),
  ]);

  const overdueDeadlines = deadlineRecords
    .filter(
      (deadline) =>
        getDeadlineCountdown(deadline.dueAt, now).kind === "OVERDUE",
    )
    .sort(
      (first, second) =>
        first.dueAt.getTime() - second.dueAt.getTime() ||
        first.id.localeCompare(second.id),
    );
  const deadlines = getUpcomingDeadlines(deadlineRecords, now, 5).map((deadline) => ({
    ...deadline,
    subject: cleanStudentFacingText(deadline.subject),
    title: cleanStudentFacingText(deadline.title),
    countdown: getDeadlineCountdown(deadline.dueAt, now),
  }));
  const schedule = scheduleData.lessons.map((item) => ({
    occurrenceId: item.id,
    occurrenceDate: new Date(
      `${getMoscowDateKey(item.startsAt)}T00:00:00.000Z`,
    ),
    startTime: item.startsAt,
    endTime: item.endsAt,
    kind: item.kind,
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
      title: cleanStudentFacingText(announcement.title),
      text: cleanStudentFacingText(announcement.text),
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
  const upcomingCurrentWeekCount = scheduleData.lessons.filter(
    (lesson) =>
      lesson.status !== "CANCELLED" &&
      lesson.startsAt.getTime() > now.getTime(),
  ).length;
  let nextScheduleLesson =
    activeScheduleLesson ??
    getNextScheduleLesson(scheduleData.lessons, now);
  let nextWeekLessons: typeof scheduleData.lessons = [];
  if (
    !nextScheduleLesson ||
    (!todaySchedule.length && upcomingCurrentWeekCount < 3)
  ) {
    const nextWeekAnchor = new Date(scheduleData.endDate);
    nextWeekAnchor.setUTCHours(12, 0, 0, 0);
    const nextWeekData = await getScheduleForGroup(
      student.group.id,
      "week",
      { now: nextWeekAnchor },
    );
    nextWeekLessons = nextWeekData.lessons;
    nextScheduleLesson ??= getNextScheduleLesson(nextWeekData.lessons, now);
  }
  const nearbyLessons = [...scheduleData.lessons, ...nextWeekLessons]
    .filter(
      (lesson) =>
        lesson.status !== "CANCELLED" && lesson.startsAt.getTime() > now.getTime(),
    )
    .sort(
      (first, second) =>
        first.startsAt.getTime() - second.startsAt.getTime() ||
        first.id.localeCompare(second.id),
    )
    .filter(
      (lesson, index, lessons) =>
        lessons.findIndex((candidate) => candidate.id === lesson.id) === index,
    )
    .slice(0, 3)
    .map((lesson) => ({
      occurrenceId: lesson.id,
      occurrenceDate: new Date(
        `${getMoscowDateKey(lesson.startsAt)}T00:00:00.000Z`,
      ),
      startTime: lesson.startsAt,
      endTime: lesson.endsAt,
      kind: lesson.kind,
      room: lesson.room,
      teacher: lesson.teacher,
      status: lesson.status,
      subject: { name: lesson.subject },
    }));
  const nextLesson = nextScheduleLesson
    ? {
        occurrenceId: nextScheduleLesson.id,
        isCurrent:
          activeScheduleLesson?.id === nextScheduleLesson.id,
        occurrenceDate: new Date(
          `${getMoscowDateKey(nextScheduleLesson.startsAt)}T00:00:00.000Z`,
        ),
        startTime: nextScheduleLesson.startsAt,
        endTime: nextScheduleLesson.endsAt,
        kind: nextScheduleLesson.kind,
        status: nextScheduleLesson.status,
        changeNote: nextScheduleLesson.changeNote,
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
    nearbyLessons,
    deadlines,
    overdueDeadlineCount: overdueDeadlines.length,
    firstOverdueDeadlineId: overdueDeadlines[0]?.id ?? null,
    changes,
    latestRequest: requests[0] ?? null,
    unreadNotificationCount,
  };
}

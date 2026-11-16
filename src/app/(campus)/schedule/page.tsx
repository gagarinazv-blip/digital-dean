import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { getDemoNow } from "@/lib/demo-date";
import {
  getMoscowDateKey,
  formatMoscowTime,
  formatMoscowWeekdayDate,
} from "@/lib/campus-time";
import { scheduleKindLabels } from "@/lib/campus-labels";
import {
  getNextScheduleLesson,
  getScheduleForGroup,
  type ScheduleLesson,
} from "@/lib/schedule-data";
import { requireStudent } from "@/lib/student";
import {
  ScheduleView,
  type ScheduleDayView,
  type ScheduleNextLessonView,
} from "./schedule-view";

type SchedulePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function ScheduleContent({
  searchParams,
}: Required<SchedulePageProps>) {
  await connection();
  const params = await searchParams;
  const student = await requireStudent();
  const lessonId =
    typeof params.lesson === "string" &&
    /^\d+$/.test(params.lesson) &&
    Number.isSafeInteger(Number(params.lesson)) &&
    Number(params.lesson) > 0
      ? Number(params.lesson)
      : null;
  const targetLesson = lessonId
    ? await getPrisma().scheduleItem.findFirst({
        where: { id: lessonId, groupId: student.group.id },
        select: { id: true, startsAt: true, date: true },
      })
    : null;

  if (typeof params.lesson === "string" && !targetLesson) notFound();

  const targetDate = targetLesson?.startsAt
    ? getMoscowDateKey(targetLesson.startsAt)
    : targetLesson?.date?.toISOString().slice(0, 10);
  if (targetLesson && !targetDate) notFound();

  const data = await getScheduleForGroup(student.group.id, "week", {
    date: targetDate ?? params.date,
    now: getDemoNow(),
    allowDateOverride: Boolean(targetLesson),
  });
  const view = params.view === "week" ? "week" : "today";
  const lastWeekday = new Date(data.endDate);
  lastWeekday.setUTCDate(lastWeekday.getUTCDate() - 1);
  const groupedLessons = new Map(
    data.groupedLessons.map(({ dateKey, lessons }) => [dateKey, lessons]),
  );
  const days: ScheduleDayView[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(data.startDate);
    date.setUTCDate(date.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const lessons = groupedLessons.get(dateKey) ?? [];
    return {
      key: dateKey,
      label: capitalizeFirst(formatMoscowWeekdayDate(date)),
      lessons: lessons.map((lesson: ScheduleLesson) => ({
        id: lesson.id,
        subject: lesson.subject,
        kindLabel: scheduleKindLabels[lesson.kind],
        status: lesson.status,
        startsAtIso: lesson.startsAt.toISOString(),
        timeLabel: `${formatMoscowTime(lesson.startsAt)}–${formatMoscowTime(lesson.endsAt)}`,
        originalTimeLabel:
          lesson.originalStartsAt && lesson.originalEndsAt
            ? `${formatMoscowTime(lesson.originalStartsAt)}–${formatMoscowTime(lesson.originalEndsAt)}`
            : null,
        originalRoom: lesson.originalRoom,
        room: lesson.room,
        teacher: lesson.teacher,
        changeNote: lesson.changeNote,
      })),
    };
  });

  const todayLessons =
    days.find((day) => day.key === data.todayKey)?.lessons ?? [];
  let nextLesson: ScheduleLesson | null = null;
  if (view === "today" && todayLessons.length === 0) {
    nextLesson = getNextScheduleLesson(data.lessons, data.referenceNow);
    if (!nextLesson) {
      const nextWeekAnchor = new Date(data.endDate);
      nextWeekAnchor.setUTCHours(12, 0, 0, 0);
      const nextWeekData = await getScheduleForGroup(
        student.group.id,
        "week",
        { now: nextWeekAnchor },
      );
      nextLesson = getNextScheduleLesson(
        nextWeekData.lessons,
        data.referenceNow,
      );
    }
  }

  const nextLessonView: ScheduleNextLessonView | null = nextLesson
    ? {
        dayLabel: capitalizeFirst(
          formatMoscowWeekdayDate(nextLesson.startsAt),
        ),
        timeLabel: formatMoscowTime(nextLesson.startsAt),
        subject: nextLesson.subject,
        room: nextLesson.room,
      }
    : null;
  const dateQuery = targetLesson
    ? `&lesson=${targetLesson.id}`
    : process.env.NODE_ENV !== "production" && typeof params.date === "string"
      ? `&date=${encodeURIComponent(params.date)}`
      : "";

  return (
    <CampusSection
      eyebrow="Учебный план"
      title="Расписание"
      description={`Группа ${student.group.name} · ${formatMoscowWeekdayDate(data.startDate)} — ${formatMoscowWeekdayDate(lastWeekday)}`}
    >
      <ScheduleView
        days={days}
        todayKey={data.todayKey}
        view={view}
        todayHref={`/schedule?view=today${dateQuery}`}
        weekHref={`/schedule?view=week${dateQuery}`}
        nextLesson={nextLessonView}
      />
    </CampusSection>
  );
}

function ScheduleFallback() {
  return (
    <CampusSection
      eyebrow="Учебный план"
      title="Расписание"
      description="Загружаем расписание вашей группы."
    >
      <p aria-busy="true">Загружаем занятия…</p>
    </CampusSection>
  );
}

export default function SchedulePage({ searchParams }: SchedulePageProps) {
  return (
    <Suspense fallback={<ScheduleFallback />}>
      <ScheduleContent searchParams={searchParams ?? Promise.resolve({})} />
    </Suspense>
  );
}

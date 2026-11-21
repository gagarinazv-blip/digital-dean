import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { DEMO_NOW, getDemoNow } from "@/lib/demo-date";
import { controlTypeLabels } from "@/lib/campus-labels";
import { getAcademicRecords } from "@/lib/academic-records";
import { getGradebookEntry } from "@/lib/gradebook-data";
import {
  formatMoscowTime,
  formatMoscowWeekdayDate,
  getMoscowDateKey,
  getMoscowTimeMinutes,
} from "@/lib/campus-time";
import {
  getStudentFacingGroupName,
  scheduleKindLabels,
} from "@/lib/campus-labels";
import {
  getNextScheduleLesson,
  getScheduleForGroup,
  type ScheduleLesson,
} from "@/lib/schedule-data";
import { parseScheduleDay, parseScheduleView } from "@/lib/schedule-view-utils";
import { requireStudent } from "@/lib/student";
import {
  ScheduleView,
  type ScheduleDayView,
  type ScheduleLessonView,
} from "./schedule-view";
import { SessionView, type SessionSemesterView } from "./session-view";
import styles from "./schedule.module.css";

type SchedulePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toLessonView(lesson: ScheduleLesson): ScheduleLessonView {
  const dateKey = lesson.id.match(/\d{4}-\d{2}-\d{2}$/)?.[0];
  if (!dateKey) {
    throw new Error(`У занятия ${lesson.id} отсутствует дата в идентификаторе.`);
  }
  return {
    id: lesson.id,
    databaseId: lesson.id.slice(0, -(dateKey.length + 1)),
    dateKey,
    subject: lesson.subject,
    kind: lesson.kind,
    kindLabel: scheduleKindLabels[lesson.kind],
    status: lesson.status,
    startsAtIso: lesson.startsAt.toISOString(),
    endsAtIso: lesson.endsAt.toISOString(),
    startsAtMinutes: getMoscowTimeMinutes(lesson.startsAt),
    endsAtMinutes: getMoscowTimeMinutes(lesson.endsAt),
    timeLabel: `${formatMoscowTime(lesson.startsAt)}–${formatMoscowTime(lesson.endsAt)}`,
    originalDateLabel:
      lesson.originalStartsAt &&
      getMoscowDateKey(lesson.originalStartsAt) !== dateKey
        ? formatMoscowWeekdayDate(lesson.originalStartsAt)
        : null,
    originalTimeLabel:
      lesson.originalStartsAt && lesson.originalEndsAt
        ? `${formatMoscowTime(lesson.originalStartsAt)}–${formatMoscowTime(lesson.originalEndsAt)}`
        : null,
    originalRoom: lesson.originalRoom,
    room: lesson.room,
    teacher: lesson.teacher,
    changeNote: lesson.changeNote,
  };
}

async function ScheduleContent({
  searchParams,
}: Required<SchedulePageProps>) {
  await connection();
  const params = await searchParams;
  const student = await requireStudent();
  const legacyExamId = getSingleParam(params.exam);
  if (legacyExamId && params.section !== "session") {
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== "exam") {
        nextParams.set(key, value);
      }
    }
    nextParams.set("section", "session");
    nextParams.set("event", legacyExamId);
    redirect(`/schedule?${nextParams.toString()}`);
  }
  if (getSingleParam(params.section) === "session") {
    const { dataset, login } = await getAcademicRecords();
    const semesters: SessionSemesterView[] =
      dataset?.semesters.map((semester) => {
        const subjects = semester.planItems.map((item) => {
          const attempts =
            item.result?.attempts.map((attempt) => ({
              number: attempt.attemptNumber,
              date: attempt.date.toISOString().slice(0, 10),
              value: attempt.value,
            })) ?? [];
          const formulaAvailable = Boolean(
            getGradebookEntry(login, semester.code, item.id),
          );
          const events = item.sessions.map((session) => ({
            id: String(session.id),
            subjectId: item.id,
            subject: item.name,
            controlType: item.controlType,
            controlLabel: controlTypeLabels[item.controlType],
            teacher: item.teacher,
            department: item.department,
            date: session.date.toISOString().slice(0, 10),
            startTime: session.startTime.toISOString().slice(11, 16),
            endTime: session.endTime.toISOString().slice(11, 16),
            room: session.room,
            status: session.status,
            resultStatus: item.result?.status ?? null,
            resultValue: item.result?.value ?? null,
            resultDate: item.result?.date.toISOString().slice(0, 10) ?? null,
            attempts,
            formulaAvailable,
          }));
          return {
            id: item.id,
            name: item.name,
            controlLabel: controlTypeLabels[item.controlType],
            controlType: item.controlType,
            teacher: item.teacher,
            department: item.department,
            resultStatus: item.result?.status ?? null,
            resultValue: item.result?.value ?? null,
            resultDate: item.result?.date.toISOString().slice(0, 10) ?? null,
            attemptCount: item.result?.attemptCount ?? 0,
            attempts,
            formulaAvailable,
            events,
          };
        });
        return {
          id: String(semester.id),
          code: semester.code,
          number: semester.number,
          name: semester.name,
          isCurrent: semester.isCurrent,
          subjects,
          events: subjects.flatMap((subject) => subject.events),
        };
      }) ?? [];
    return (
      <CampusSection
        eyebrow="Учебный план"
        title="Расписание"
        description={`Сессия · ${dataset?.academicYear ?? "результаты и предстоящие экзамены"}`}
      >
        <SessionView
          academicYear={dataset?.academicYear ?? ""}
          nowTime={formatMoscowTime(getDemoNow())}
          semesters={semesters}
          todayKey={getMoscowDateKey(getDemoNow())}
        />
      </CampusSection>
    );
  }
  const rawLessonId = getSingleParam(params.lesson);
  const lessonId =
    rawLessonId &&
    /^\d+$/.test(rawLessonId) &&
    Number.isSafeInteger(Number(rawLessonId)) &&
    Number(rawLessonId) > 0
      ? Number(rawLessonId)
      : null;
  const targetLesson = lessonId
    ? await getPrisma().scheduleItem.findFirst({
        where: { id: lessonId, groupId: student.group.id },
        select: { id: true, startsAt: true, date: true },
      })
    : null;

  if (params.lesson !== undefined && !targetLesson) notFound();

  const targetDate = targetLesson?.startsAt
    ? getMoscowDateKey(targetLesson.startsAt)
    : targetLesson?.date?.toISOString().slice(0, 10);
  const view = parseScheduleView(getSingleParam(params.view));
  const openDayKey = parseScheduleDay(params.day, view);
  const requestedDate = isDateKey(params.date) ? params.date : undefined;
  const selectedDate =
    targetDate ??
    requestedDate ??
    openDayKey ??
    getMoscowDateKey(getDemoNow());
  const data = await getScheduleForGroup(
    student.group.id,
    view === "month" ? "month" : "week",
    {
      date: targetDate ?? requestedDate ?? openDayKey ?? undefined,
      now: getDemoNow(),
      allowDateOverride: Boolean(targetLesson || requestedDate || openDayKey),
    },
  );

  const dayCount = view === "month" ? 42 : 7;
  const groupedLessons = new Map(
    data.groupedLessons.map(({ dateKey, lessons }) => [dateKey, lessons]),
  );
  const days: ScheduleDayView[] = Array.from(
    { length: dayCount },
    (_, index) => {
      const date = new Date(data.startDate);
      date.setUTCDate(date.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      const lessons = (groupedLessons.get(dateKey) ?? []).map(toLessonView);
      return {
        key: dateKey,
        label: formatMoscowWeekdayDate(
          new Date(`${dateKey}T12:00:00.000Z`),
        ),
        lessons,
      };
    },
  );

  const selectedLesson =
    targetLesson && targetDate
      ? days
          .flatMap((day) => day.lessons)
          .find(
            (lesson) =>
              lesson.databaseId === String(targetLesson.id) &&
              lesson.dateKey === targetDate,
          ) ?? null
      : targetLesson
        ? days
            .flatMap((day) => day.lessons)
            .find(
              (lesson) =>
                lesson.databaseId === String(targetLesson.id) &&
                lesson.dateKey === selectedDate,
            ) ?? null
        : null;

  const validKinds = new Set(["LECTURE", "SEMINAR", "PRACTICE"]);
  const kindParam = getSingleParam(params.kind);
  const filters = {
    kind: kindParam && validKinds.has(kindParam) ? kindParam : "",
    subject: getSingleParam(params.subject)?.slice(0, 120) ?? "",
    q: getSingleParam(params.q)?.slice(0, 100) ?? "",
    changed: getSingleParam(params.changed) === "1",
  };
  const todayKey = getMoscowDateKey(getDemoNow());
  let nextLesson = getNextScheduleLesson(data.lessons, data.referenceNow);
  if (view === "today" && selectedDate === todayKey && !nextLesson) {
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
  const description = `Группа ${getStudentFacingGroupName(student.group.name)}`;

  return (
    <CampusSection
      eyebrow="Учебный план"
      title="Расписание"
      description={description}
    >
      <ScheduleView
        key={`${view}:${filters.kind}:${filters.subject}:${filters.q}:${filters.changed}`}
        days={days}
        todayKey={todayKey}
        view={view}
        nowIso={getDemoNow().toISOString()}
        selectedDate={selectedDate}
        selectedLesson={selectedLesson}
        nextLesson={nextLesson ? toLessonView(nextLesson) : null}
        groupName={getStudentFacingGroupName(student.group.name)}
        filters={filters}
        isDemoTime={Boolean(DEMO_NOW)}
        openDayKey={openDayKey}
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
      <div aria-busy="true" className={styles.scheduleSkeleton}>
        <span />
        <span />
        <span />
      </div>
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

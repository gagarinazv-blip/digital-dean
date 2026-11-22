import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, Calendar, GraphUp, HelpCircle } from "iconoir-react";
import type { ScheduleKind } from "@/generated/prisma/enums";
import { getCampusTodayData } from "@/lib/campus-data";
import {
  controlTypeLabels,
} from "@/lib/campus-labels";
import {
  getUniversityDateTimeFormatter,
  getCampusGreeting,
  getMoscowDateKey,
  getMoscowDateTime,
} from "@/lib/campus-time";
import { getAcademicRecords } from "@/lib/academic-records";
import { pluralize } from "@/lib/plural";
import { getAverageGrade } from "@/lib/grade-average";
import { countActiveStudentRequests } from "@/lib/student-request-data";
import controls from "@/components/ui/controls.module.css";
import { getDeadlineHref } from "@/lib/deadline-action";
import { WeekStrip } from "@/components/week-strip";
import { EmptyState } from "@/components/empty-state";
import { DeadlineList, type TodayDeadline } from "@/components/today/deadline-list";
import { LessonList } from "@/components/today/lesson-list";
import { NextLessonCard } from "@/components/today/next-lesson-card";
import { getOnlineLink } from "@/lib/room-format";
import { buildScheduleHref } from "@/lib/schedule-view-utils";
import {
  getTodayFocus,
  type TodayEvent,
} from "@/lib/today-view-utils";
import styles from "./page.module.css";

const scheduleKindLabels: Record<ScheduleKind, string> = {
  LECTURE: "Лекция",
  SEMINAR: "Семинар",
  PRACTICE: "Практика",
};

const quickActionIcons = {
  schedule: Calendar,
  grades: GraphUp,
  help: HelpCircle,
};

const quickActions = [
  {
    href: "/requests/new",
    label: "Заказать справку",
    name: "help",
  },
  {
    href: "/grades",
    label: "Рассчитать оценку",
    name: "grades",
  },
  {
    href: "/schedule",
    label: "Моё расписание",
    name: "schedule",
  },
] as const;

const monthFormatter = getUniversityDateTimeFormatter({
  month: "long",
  year: "numeric",
});

type QuickActionName = keyof typeof quickActionIcons;

function QuickActionIcon({ name }: { name: QuickActionName }) {
  const Icon = quickActionIcons[name];
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.8}
    />
  );
}

function CampusFallback() {
  return (
    <main
      aria-busy="true"
      aria-label="Загружаем план на день"
      className={styles.page}
    >
      <span aria-hidden="true" className={styles.skeletonHeading} />
      <span aria-hidden="true" className={styles.skeletonHero} />
      <span aria-hidden="true" className={styles.skeletonActions} />
      <span aria-hidden="true" className={styles.skeletonCard} />
    </main>
  );
}

// Больше строк не поместится и на высоком экране: лишние не запрашиваем.
const DASHBOARD_ROWS = 8;

type CampusTodayData = Awaited<ReturnType<typeof getCampusTodayData>>;
type AcademicDataset = Awaited<ReturnType<typeof getAcademicRecords>>["dataset"];

function getLessonEvents(data: CampusTodayData): TodayEvent[] {
  const lessons = [...data.todaySchedule, ...data.nearbyLessons];
  return lessons
    .filter(
      (lesson, index) =>
        lessons.findIndex(
          (candidate) => candidate.occurrenceId === lesson.occurrenceId,
        ) === index,
    )
    .map((lesson) => {
      const dateKey = getMoscowDateKey(lesson.startTime);
      return {
        id: lesson.occurrenceId,
        kind: "lesson",
        title: lesson.subject.name,
        typeLabel: scheduleKindLabels[lesson.kind],
        startsAt: lesson.startTime,
        endsAt: lesson.endTime,
        originalStartsAt: lesson.originalStartTime,
        originalEndsAt: lesson.originalEndTime,
        status: lesson.status,
        room: lesson.room,
        teacher: lesson.teacher,
        onlineUrl: getOnlineLink(lesson.room, lesson.changeNote),
        scheduleHref: buildScheduleHref("week", dateKey),
        detailsHref: buildScheduleHref(
          "week",
          dateKey,
          {},
          // Идентификатор занятия — «<id записи>-<дата>».
          lesson.occurrenceId.slice(0, -(dateKey.length + 1)),
        ),
      };
    });
}

function getSessionEvents(
  dataset: AcademicDataset,
  todayKey: string,
): TodayEvent[] {
  return (dataset?.semesters ?? [])
    .filter((semester) => semester.isCurrent)
    .flatMap((semester) => semester.planItems)
    .flatMap((item) =>
      item.sessions
        .filter(
          (session) =>
            (session.status === "PLANNED" ||
              session.status === "RESCHEDULED") &&
            session.date.toISOString().slice(0, 10) >= todayKey &&
            (!item.result ||
              (item.result.status === "ACADEMIC_DEBT" &&
                session.date > item.result.date)),
        )
        .map((session): TodayEvent => {
          const href = `/schedule?section=session&event=${session.id}`;
          return {
            id: `session-${session.id}`,
            kind: "session",
            title: item.name,
            typeLabel: controlTypeLabels[item.controlType],
            startsAt: getMoscowDateTime(session.date, session.startTime),
            endsAt: getMoscowDateTime(session.date, session.endTime),
            originalStartsAt: null,
            originalEndsAt: null,
            status: session.status === "RESCHEDULED" ? "RESCHEDULED" : "PLANNED",
            room: session.room,
            teacher: null,
            onlineUrl: getOnlineLink(session.room),
            scheduleHref: href,
            detailsHref: href,
          };
        }),
    );
}

async function CampusToday() {
  await connection();
  const [data, academicRecords] = await Promise.all([
    getCampusTodayData(),
    getAcademicRecords(),
  ]);
  const activeRequestCount = await countActiveStudentRequests(data.student.id);
  const todayKey = getMoscowDateKey(data.now);
  const lessonEvents = getLessonEvents(data);
  const sessionEvents = getSessionEvents(academicRecords.dataset, todayKey);
  const events = [...lessonEvents, ...sessionEvents];
  const focus = getTodayFocus(events, data.now);
  const upcomingDeadlines: TodayDeadline[] = [
    ...data.deadlines.map((deadline) => ({
      id: deadline.id,
      kind: "deadline" as const,
      title: deadline.title,
      subject: deadline.subject,
      dueAt: deadline.dueAt,
      endsAt: null,
      href: getDeadlineHref(deadline.id),
    })),
    ...sessionEvents
      .filter((event) => event.endsAt > data.now)
      .map((event) => ({
        id: event.id,
        kind: "session" as const,
        title: event.title,
        subject: event.typeLabel,
        dueAt: event.startsAt,
        endsAt: event.endsAt,
        href: event.detailsHref,
      })),
  ].sort((first, second) => first.dueAt.getTime() - second.dueAt.getTime());
  // Экзамен из главной карточки в списке сроков не повторяется.
  const deadlineRows = upcomingDeadlines
    .filter(
      (row) => row.id !== focus.next?.id && row.id !== focus.main?.id,
    )
    .slice(0, DASHBOARD_ROWS);
  const deadlineKeys = new Set(
    upcomingDeadlines.map((row) => getMoscowDateKey(row.dueAt)),
  );
  const averageGrade = getAverageGrade(
    (academicRecords.dataset?.semesters ?? [])
      .filter((semester) => semester.isCurrent)
      .flatMap((semester) => semester.planItems)
      .map((item) => item.result?.value),
  );
  const todayLessonCount = data.todaySchedule.filter(
    (lesson) => lesson.status !== "CANCELLED",
  ).length;
  const actionMetrics: Record<
    QuickActionName,
    { value: string; caption: string }
  > = {
    help: {
      value: String(activeRequestCount),
      caption: `${pluralize(activeRequestCount, "заявка", "заявки", "заявок")} в работе`,
    },
    grades: {
      value: averageGrade === null ? "—" : averageGrade.toFixed(1).replace(".", ","),
      caption: "средний балл",
    },
    schedule: {
      value: String(todayLessonCount),
      caption: `${pluralize(todayLessonCount, "пара", "пары", "пар")} сегодня`,
    },
  };
  const todayDate = new Date(`${data.week.todayKey}T00:00:00.000Z`);
  const firstName = data.student.fullName.split(" ")[0];

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <section className={styles.welcome} aria-labelledby="welcome-title">
          <h1 id="welcome-title">
            {getCampusGreeting(data.now)}, {firstName}
          </h1>
        </section>
        <WeekStrip
          days={data.weekDays.map((day) => ({
            ...day,
            hasDeadline: deadlineKeys.has(day.key),
          }))}
          title={monthFormatter.format(todayDate).replace(" г.", "")}
          todayKey={todayKey}
        />
      </div>

      <NextLessonCard events={events} serverNow={data.now} />

      <section
        className={styles.quickActionsSection}
        aria-labelledby="quick-actions-title"
      >
        <h2 className={controls.visuallyHidden} id="quick-actions-title">
          Быстрые действия
        </h2>
        <nav className={styles.quickActions} aria-label="Быстрые действия">
          {quickActions.map((action) => (
            <Link
              className={styles.actionTile}
              data-tone={action.name}
              href={action.href}
              key={action.name}
            >
              <span className={styles.actionLabel}>
                <QuickActionIcon name={action.name} />
                {action.label}
              </span>
              <span className={styles.actionMetric}>
                <strong>{actionMetrics[action.name].value}</strong>
                <span>{actionMetrics[action.name].caption}</span>
              </span>
              <span aria-hidden="true" className={styles.actionNotch}>
                <span className={styles.actionArrow}>
                  <ArrowUpRight strokeWidth={1.8} />
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <div className={styles.lists}>
        <section
          className={styles.card}
          aria-labelledby="today-schedule-title"
        >
          <div className={styles.cardHeading}>
            <h2 id="today-schedule-title">Ближайшие занятия</h2>
            <Link className={styles.headingLink} href="/schedule">
              Все занятия →
            </Link>
          </div>
          <LessonList events={events} serverNow={data.now} />
        </section>

        <section
          className={styles.card}
          aria-labelledby="deadlines-title"
        >
          <div className={styles.cardHeading}>
            <h2 id="deadlines-title">Дедлайны</h2>
            {data.overdueDeadlineCount > 0 ? (
              <Link
                aria-label={`Показать просроченные задания: ${data.overdueDeadlineCount}`}
                className={styles.overdueChip}
                href={
                  data.firstOverdueDeadlineId
                    ? `/deadlines#deadline-${data.firstOverdueDeadlineId}`
                    : "/deadlines"
                }
              >
                Просрочено: {data.overdueDeadlineCount}
              </Link>
            ) : null}
            <Link className={styles.headingLink} href="/deadlines">
              Все задания →
            </Link>
          </div>
          {deadlineRows.length > 0 ? (
            <DeadlineList deadlines={deadlineRows} serverNow={data.now} />
          ) : (
            <EmptyState
              className={styles.cardEmptyState}
              illustration="documents"
              title="Ближайших сроков нет"
            />
          )}
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<CampusFallback />}>
      <CampusToday />
    </Suspense>
  );
}

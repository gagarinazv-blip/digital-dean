import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, Calendar, GraphUp, HelpCircle } from "iconoir-react";
import type { ScheduleKind } from "@/generated/prisma/enums";
import { getCampusTodayData } from "@/lib/campus-data";
import {
  controlTypeLabels,
  getStudentFacingGroupName,
} from "@/lib/campus-labels";
import {
  getUniversityDateTimeFormatter,
  getCampusGreeting,
  getMoscowDateKey,
  getMoscowDateTime,
} from "@/lib/campus-time";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getRequestCatalogTitle } from "@/lib/request-catalog";
import { getAcademicRecords } from "@/lib/academic-records";
import { pluralize } from "@/lib/plural";
import { getAverageGrade } from "@/lib/grade-average";
import { countActiveStudentRequests } from "@/lib/student-request-data";
import { getStudentNotificationPage } from "@/lib/notification-data";
import { presentStudentNotifications } from "@/lib/notification-presentation";
import { notificationTypeLabels } from "@/lib/notification-workflow";
import { DateTimeStack } from "@/components/date-time-stack";
import controls from "@/components/ui/controls.module.css";
import { getDeadlineHref } from "@/lib/deadline-action";
import { formatRequestNumber } from "@/lib/request-number";
import { WeekStrip } from "@/components/week-strip";
import { DeadlineListItem } from "@/components/deadline-list-item";
import { EmptyState } from "@/components/empty-state";
import { CampusArchitectureArt } from "@/components/campus-architecture-art";
import {
  getRequestStatusTone,
  getTodayHeroState,
  type RequestStatusTone,
} from "@/lib/today-view-utils";
import styles from "./page.module.css";

const requestStatusTones: Record<RequestStatusTone, string> = {
  new: "neutral",
  inProgress: "info",
  needsInfo: "warning",
  ready: "success",
  rejected: "danger",
  cancelled: "neutral",
};

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
    description: "Подать новую заявку",
    name: "help",
  },
  {
    href: "/grades",
    label: "Рассчитать оценку",
    description: "Проверить итоговый балл",
    name: "grades",
  },
  {
    href: "/schedule",
    label: "Моё расписание",
    description: "Пары и сессия на неделе",
    name: "schedule",
  },
] as const;

const monthFormatter = getUniversityDateTimeFormatter({
  month: "long",
  year: "numeric",
});

const welcomeDateFormatter = getUniversityDateTimeFormatter({
  weekday: "long",
  day: "numeric",
  month: "long",
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
      <div aria-hidden="true" className={styles.board}>
        <div className={styles.mainColumn}>
          <span className={styles.skeletonHeading} />
          <span className={styles.skeletonHero} />
          <span className={styles.skeletonActions} />
          <span className={styles.skeletonCard} />
        </div>
        <div className={styles.sideColumn}>
          <span className={styles.skeletonHero} />
          <span className={styles.skeletonCard} />
          <span className={styles.skeletonActions} />
        </div>
      </div>
    </main>
  );
}

// Больше строк не поместится и на высоком экране: лишние не запрашиваем.
const DASHBOARD_ROWS = 12;

async function CampusToday() {
  await connection();
  const [data, academicRecords] = await Promise.all([
    getCampusTodayData(),
    getAcademicRecords(),
  ]);
  const [notificationPage, activeRequestCount] = await Promise.all([
    getStudentNotificationPage(data.student.id, DASHBOARD_ROWS),
    countActiveStudentRequests(data.student.id),
  ]);
  const notificationItems = await presentStudentNotifications(
    notificationPage.notifications,
    data.student.id,
    data.student.group.id,
  );
  const notificationTotal = Object.values(notificationPage.typeCounts).reduce(
    (total, count) => total + count,
    0,
  );
  // Изменения расписания и объявления группы дополняют личные уведомления.
  const notifications = [
    ...notificationItems.map((item) => ({
      id: item.publicId,
      kind: notificationTypeLabels[item.type],
      title: item.title,
      text: item.text,
      date: new Date(item.createdAt),
      href: `/notifications/${item.publicId}`,
      isUnread: item.readAt === null,
    })),
    ...data.changes.map((change) => ({
      id: change.id,
      kind: change.kind,
      title: change.title,
      text: change.text,
      date: change.date,
      href: change.id.startsWith("schedule-")
        ? `/schedule?view=week&date=${getMoscowDateKey(change.date)}`
        : "/notifications",
      isUnread: false,
    })),
  ]
    .sort(
      (first, second) =>
        Number(second.isUnread) - Number(first.isUnread) ||
        second.date.getTime() - first.date.getTime(),
    )
    .slice(0, DASHBOARD_ROWS);
  const todayKey = getMoscowDateKey(data.now);
  const sessionDeadlines =
    academicRecords.dataset?.semesters
      .filter((semester) => semester.isCurrent)
      .flatMap((semester) =>
        semester.planItems.flatMap((item) =>
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
            .map((session) => ({
              id: `session-${session.id}`,
              title: item.name,
              subject: controlTypeLabels[item.controlType],
              startsAt: getMoscowDateTime(session.date, session.startTime),
              endsAt: getMoscowDateTime(session.date, session.endTime),
              href: `/schedule?section=session&event=${session.id}`,
            })),
        ),
      )
      .sort(
        (first, second) => first.startsAt.getTime() - second.startsAt.getTime(),
      ) ?? [];
  const deadlineRows = [
    ...data.deadlines.map((deadline) => ({
      id: deadline.id,
      title: deadline.title,
      subject: deadline.subject,
      dueAt: deadline.dueAt,
      href: getDeadlineHref(deadline.id),
    })),
    ...sessionDeadlines.map((session) => ({
      id: session.id,
      title: session.title,
      subject: session.subject,
      dueAt: session.startsAt,
      href: session.href,
    })),
  ]
    .sort((first, second) => first.dueAt.getTime() - second.dueAt.getTime())
    .slice(0, DASHBOARD_ROWS);
  const nextSession = sessionDeadlines[0];
  const lessonRows = [
    ...data.todaySchedule,
    ...data.nearbyLessons.filter(
      (lesson) => getMoscowDateKey(lesson.startTime) !== todayKey,
    ),
  ];
  const deadlineKeys = new Set(
    deadlineRows.map((row) => getMoscowDateKey(row.dueAt)),
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
  const latestRequestTitle = data.latestRequest
    ? getRequestCatalogTitle(
        data.latestRequest.catalogCode,
        requestTypeLabels[data.latestRequest.type],
        data.latestRequest.formSchemaSnapshot,
      )
    : "";
  const firstName = data.student.fullName.split(" ")[0];
  const hero = getTodayHeroState(
    data.todaySchedule,
    data.nextLesson,
    data.now,
  );
  const activeLessonId =
    hero.kind === "current" ? hero.lesson?.occurrenceId : undefined;
  const nextLessonId =
    hero.kind === "next" ? hero.lesson?.occurrenceId : undefined;

  return (
    <main className={styles.page}>
      <div className={styles.board}>
        <div className={styles.mainColumn}>
          <section className={styles.welcome} aria-labelledby="welcome-title">
            <h1 id="welcome-title">
              {getCampusGreeting(data.now)}, {firstName}
            </h1>
            <p className={styles.eyebrow}>
              {welcomeDateFormatter.format(todayDate)} · группа{" "}
              {getStudentFacingGroupName(data.student.group.name)}
            </p>
          </section>

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
                  <span className={styles.actionText}>
                    <span className={styles.actionLabel}>
                      <QuickActionIcon name={action.name} />
                      {action.label}
                    </span>
                    <span className={styles.actionDescription}>
                      {action.description}
                    </span>
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

          <section
            className={styles.heroCard}
            aria-labelledby="next-lesson-title"
          >
            <div className={styles.heroArt} aria-hidden="true">
              <CampusArchitectureArt
                priority
                sizes="(max-width: 767px) 0px, (max-width: 1099px) 42vw, 30vw"
              />
            </div>
            <div className={styles.heroContent}>
              <div className={styles.heroTopline}>
                <span className={styles.heroBadge}>
                  {hero.kind === "current"
                    ? "Идёт сейчас"
                    : hero.kind === "next"
                      ? "Следующая пара"
                      : "Ближайшее занятие"}
                </span>
                {hero.kind === "current" && hero.countdown ? (
                  <span className={styles.heroNote}>{hero.countdown}</span>
                ) : hero.kind === "upcoming" ? (
                  <span className={styles.heroNote}>
                    {hero.hasTodayLessons
                      ? "На сегодня пары закончились"
                      : "Сегодня занятий нет"}
                  </span>
                ) : null}
              </div>
              {hero.lesson ? (
                <div className={styles.lesson}>
                  <h2 id="next-lesson-title" title={hero.lesson.subject.name}>
                    {hero.lesson.subject.name}
                  </h2>
                  <p
                    title={`${scheduleKindLabels[hero.lesson.kind]} · ауд. ${hero.lesson.room} · ${hero.lesson.teacher}`}
                  >
                    {scheduleKindLabels[hero.lesson.kind]} · ауд.{" "}
                    {hero.lesson.room} · {hero.lesson.teacher}
                  </p>
                </div>
              ) : (
                <div className={styles.lesson}>
                  <h2 id="next-lesson-title">
                    {hero.hasTodayLessons
                      ? "На сегодня пары закончились"
                      : "На сегодня занятий нет"}
                  </h2>
                  <p>
                    {hero.hasTodayLessons
                      ? "Посмотрите расписание на другие дни."
                      : "В расписании пока нет ближайших занятий."}
                  </p>
                </div>
              )}
              <div className={styles.heroFooter}>
                {hero.lesson ? (
                  <DateTimeStack
                    end={hero.lesson.endTime}
                    value={hero.lesson.startTime}
                  />
                ) : null}
                <div className={styles.heroActions}>
                  <Link className={controls.primary} href="/schedule">
                    Открыть расписание
                  </Link>
                  {hero.lesson && (
                    <Link
                      className={controls.secondary}
                      href={`/schedule?view=week&date=${hero.lesson.occurrenceDate.toISOString().slice(0, 10)}`}
                    >
                      Подробнее
                    </Link>
                  )}
                </div>
              </div>
            </div>
            {nextSession && (
              <Link
                aria-label={`Ближайшее событие сессии: ${nextSession.title}`}
                className={styles.heroSession}
                href={nextSession.href}
              >
                <span className={styles.heroSessionBadge}>
                  {nextSession.subject}
                </span>
                <strong title={nextSession.title}>{nextSession.title}</strong>
                <DateTimeStack
                  end={nextSession.endsAt}
                  value={nextSession.startsAt}
                />
              </Link>
            )}
          </section>

          <div className={styles.lists}>
            <section
              className={`${styles.card} ${styles.scheduleCard}`}
              aria-labelledby="today-schedule-title"
            >
              <div className={styles.cardHeading}>
                <h2 id="today-schedule-title">
                  {data.todaySchedule.length > 0
                    ? "Расписание на сегодня"
                    : "Ближайшие занятия"}
                </h2>
                <Link className={styles.headingLink} href="/schedule">
                  Все занятия →
                </Link>
              </div>
              {lessonRows.length > 0 ? (
                <div className={styles.fit}>
                <ol className={styles.rows}>
                  {lessonRows.map((lesson) => {
                    const details = `${scheduleKindLabels[lesson.kind]} · ауд. ${lesson.room}`;
                    const note =
                      lesson.status === "CANCELLED"
                        ? "Отменено"
                        : lesson.status === "RESCHEDULED"
                          ? "Перенесено"
                          : lesson.occurrenceId === activeLessonId
                            ? "Сейчас"
                            : lesson.occurrenceId === nextLessonId
                              ? "Далее"
                              : null;
                    return (
                      <li
                        className={styles.row}
                        data-kind={lesson.kind}
                        data-state={
                          lesson.occurrenceId === activeLessonId
                            ? "current"
                            : lesson.status === "CANCELLED" ||
                                lesson.endTime.getTime() <= data.now.getTime()
                              ? "past"
                              : undefined
                        }
                        key={lesson.occurrenceId}
                      >
                        <div className={styles.rowText}>
                          <strong title={lesson.subject.name}>
                            {lesson.subject.name}
                          </strong>
                          <span title={details}>
                            {note ? (
                              <em
                                data-tone={
                                  lesson.status === "CANCELLED"
                                    ? "danger"
                                    : lesson.status === "RESCHEDULED"
                                      ? "warning"
                                      : "accent"
                                }
                              >
                                {note}
                              </em>
                            ) : null}
                            {details}
                          </span>
                        </div>
                        <DateTimeStack
                          align="end"
                          end={lesson.endTime}
                          value={lesson.startTime}
                        />
                      </li>
                    );
                  })}
                </ol>
                </div>
              ) : (
              <EmptyState
                action={
                  <Link className={styles.textLink} href="/schedule?view=week">
                    Показать неделю →
                  </Link>
                }
                className={styles.cardEmptyState}
                illustration="schedule"
                title="Ближайших занятий нет"
              />
              )}
            </section>

            <section
              className={`${styles.card} ${styles.deadlineCard}`}
              aria-labelledby="deadlines-title"
            >
              <div className={styles.cardHeading}>
                <h2 id="deadlines-title">
                  Ближайшие дедлайны{" "}
                  {deadlineRows.length > 0 ? (
                    <span
                      aria-label={`Предстоящих сроков: ${deadlineRows.length}`}
                      className={controls.badge}
                      data-tone="accent"
                    >
                      {deadlineRows.length}
                    </span>
                  ) : null}
                </h2>
                <Link className={styles.headingLink} href="/deadlines">
                  Все сроки →
                </Link>
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
              </div>
              {deadlineRows.length ? (
                <div className={styles.fit}>
                <ul className={styles.rows}>
                  {deadlineRows.map((deadline) => (
                    <DeadlineListItem
                      dueAt={deadline.dueAt}
                      href={deadline.href}
                      key={deadline.id}
                      subject={deadline.subject}
                      title={deadline.title}
                    />
                  ))}
                </ul>
                </div>
              ) : (
                <EmptyState
                  className={styles.cardEmptyState}
                  illustration="documents"
                  title="Ближайших сроков нет"
                />
              )}
            </section>
          </div>
        </div>

        <div className={styles.sideColumn}>
          <WeekStrip
            days={data.weekDays.map((day) => ({
              ...day,
              hasDeadline: deadlineKeys.has(day.key),
            }))}
            title={monthFormatter.format(todayDate).replace(" г.", "")}
            todayKey={todayKey}
          />

          <section
            className={`${styles.card} ${styles.notificationCard}`}
            aria-labelledby="dashboard-notifications-title"
          >
            <div className={styles.cardHeading}>
              <h2 id="dashboard-notifications-title">
                Уведомления{" "}
                {notificationPage.unreadCount > 0 ? (
                  <span className={controls.badge} data-tone="accent">
                    Новых: {notificationPage.unreadCount}
                  </span>
                ) : null}
              </h2>
            </div>
            {notifications.length > 0 ? (
              <div className={styles.fit}>
              <ul className={styles.rows}>
                {notifications.map((notification) => (
                  <li className={styles.row} key={notification.id}>
                    <Link className={styles.rowLink} href={notification.href}>
                      <span className={styles.rowText}>
                        <strong title={notification.title}>
                          {notification.isUnread ? (
                            <span
                              aria-label="Не прочитано"
                              className={styles.unreadDot}
                              role="img"
                            />
                          ) : null}
                          {notification.title}
                        </strong>
                        <span title={notification.text}>
                          {notification.text || notification.kind}
                        </span>
                      </span>
                      <DateTimeStack align="end" value={notification.date} />
                    </Link>
                  </li>
                ))}
              </ul>
              </div>
            ) : (
              <EmptyState
                art="notifications"
                className={styles.cardEmptyState}
                description="Здесь появятся изменения расписания, сроки и статусы заявок."
                illustration="notifications"
                title="Новых уведомлений нет"
              />
            )}
            <Link className={styles.cardFooterLink} href="/notifications">
              Все уведомления ({notificationTotal}) →
            </Link>
          </section>

          <section
            className={`${styles.card} ${styles.requestCard}`}
            aria-labelledby="request-title"
          >
            <div className={styles.cardHeading}>
              <h2 id="request-title">Моя последняя заявка</h2>
              {data.latestRequest ? (
                <span
                  className={controls.badge}
                  data-tone={
                    requestStatusTones[
                      getRequestStatusTone(data.latestRequest.status)
                    ]
                  }
                >
                  {requestStatusLabels[data.latestRequest.status]}
                </span>
              ) : null}
            </div>
            {data.latestRequest ? (
              <>
                <div className={styles.requestRow}>
                  <div className={styles.rowText}>
                    <strong title={latestRequestTitle}>
                      {latestRequestTitle}
                    </strong>
                    <span>
                      {formatRequestNumber(data.latestRequest.id)} · обновлена
                    </span>
                  </div>
                  <DateTimeStack
                    align="end"
                    value={data.latestRequest.updatedAt}
                  />
                </div>
                <Link
                  className={styles.cardFooterLink}
                  href={`/requests/${data.latestRequest.publicId}`}
                >
                  Отследить заявку →
                </Link>
              </>
            ) : (
              <EmptyState
                action={
                  <Link className={controls.secondary} href="/requests/new">
                    Новая заявка
                  </Link>
                }
                className={styles.cardEmptyState}
                illustration="requests"
                title="Заявок пока нет"
              />
            )}
          </section>
        </div>
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

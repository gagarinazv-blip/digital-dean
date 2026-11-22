import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Calendar, GraphUp, HelpCircle } from "iconoir-react";
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
import { getStudentNotificationPage } from "@/lib/notification-data";
import { presentStudentNotifications } from "@/lib/notification-presentation";
import { notificationTypeLabels } from "@/lib/notification-workflow";
import { DateTimeStack } from "@/components/date-time-stack";
import controls from "@/components/ui/controls.module.css";
import { getDeadlineHref } from "@/lib/deadline-action";
import { formatRequestNumber } from "@/lib/request-number";
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
      <span className={styles.skeletonHeading} />
      <div aria-hidden="true" className={styles.skeletonActions}>
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden="true" className={styles.dashboardColumns}>
        <div className={styles.primaryStack}>
          <span className={styles.skeletonHero} />
          <span className={styles.skeletonCard} />
        </div>
        <div className={styles.secondaryStack}>
          <span className={styles.skeletonCard} />
          <span className={styles.skeletonHero} />
        </div>
        <span className={styles.skeletonCard} />
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
  const notificationPage = await getStudentNotificationPage(
    data.student.id,
    DASHBOARD_ROWS,
  );
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
              href={action.href}
              key={action.name}
            >
              <span className={styles.actionIcon}>
                <QuickActionIcon name={action.name} />
              </span>
              <span className={styles.actionText}>
                <span className={styles.actionLabel}>{action.label}</span>
                <span className={styles.actionDescription}>
                  {action.description}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <div
        className={styles.dashboardColumns}
        data-notifications={notifications.length > 0 ? "list" : "empty"}
      >
        <div className={styles.primaryStack}>
          <section
            className={styles.heroCard}
            aria-labelledby="next-lesson-title"
          >
            <div className={styles.heroArt} aria-hidden="true">
              <CampusArchitectureArt
                priority
                sizes="(max-width: 767px) 0px, (max-width: 1099px) 42vw, 20vw"
              />
            </div>
            <div className={styles.heroContent}>
              <div className={styles.heroTopline}>
                <div className={styles.heroLabels}>
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
                  <DateTimeStack
                    align="end"
                    end={hero.lesson.endTime}
                    value={hero.lesson.startTime}
                  />
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
              {nextSession && (
                <Link
                  aria-label={`Ближайшее событие сессии: ${nextSession.title}`}
                  className={styles.heroSession}
                  href={nextSession.href}
                >
                  <span className={styles.heroSessionDetails}>
                    <span className={styles.heroSessionBadge}>
                      {nextSession.subject}
                    </span>
                    <strong title={nextSession.title}>{nextSession.title}</strong>
                  </span>
                  <DateTimeStack
                    align="end"
                    end={nextSession.endsAt}
                    value={nextSession.startsAt}
                  />
                </Link>
              )}
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
          </section>

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
            <Link className={styles.cardFooterLink} href="/schedule">
              Все занятия →
            </Link>
          </section>
        </div>

        <div className={styles.secondaryStack}>
          <section
            className={`${styles.card} ${styles.deadlineCard}`}
            aria-labelledby="deadlines-title"
          >
            <div className={styles.cardHeading}>
              <h2 id="deadlines-title">Ближайшие дедлайны</h2>
              {deadlineRows.length > 0 ? (
                <span
                  aria-label={`Предстоящих сроков: ${deadlineRows.length}`}
                  className={controls.badge}
                  data-tone="accent"
                >
                  {deadlineRows.length}
                </span>
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
            <div className={styles.deadlineFooter}>
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
              <Link className={styles.cardFooterLink} href="/deadlines">
                Все сроки →
              </Link>
            </div>
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

        <section
          className={`${styles.card} ${styles.notificationCard}`}
          aria-labelledby="dashboard-notifications-title"
        >
          <div className={styles.cardHeading}>
            <h2 id="dashboard-notifications-title">Уведомления</h2>
            {notificationPage.unreadCount > 0 ? (
              <span className={controls.badge} data-tone="accent">
                Новых: {notificationPage.unreadCount}
              </span>
            ) : null}
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
            <p className={styles.compactEmpty}>
              Новых уведомлений нет. Здесь появятся изменения расписания, сроки и
              статусы заявок.
            </p>
          )}
          <Link className={styles.cardFooterLink} href="/notifications">
            Все уведомления ({notificationTotal}) →
          </Link>
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

import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { ScheduleKind } from "@/generated/prisma/enums";
import { getCampusTodayData } from "@/lib/campus-data";
import {
  controlTypeLabels,
  getStudentFacingGroupName,
} from "@/lib/campus-labels";
import {
  formatCampusDate,
  formatCampusTime,
  formatMoscowDate,
  formatMoscowTime,
  getCampusGreeting,
  getMoscowDateKey,
} from "@/lib/campus-time";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getRequestCatalogTitle } from "@/lib/request-catalog";
import { getAcademicRecords } from "@/lib/academic-records";
import { getSessionCountdown } from "@/lib/session-utils";
import { getDeadlineCountdownTone } from "@/lib/deadline-utils";
import { formatRequestNumber } from "@/lib/request-number";
import { DeadlineListItem } from "@/components/deadline-list-item";
import {
  getRequestStatusTone,
  getTodayHeroState,
  type RequestStatusTone,
} from "@/lib/today-view-utils";
import styles from "./page.module.css";

const requestStatusClasses: Record<RequestStatusTone, string> = {
  new: styles.statusPending,
  inProgress: styles.statusInProgress,
  needsInfo: styles.statusNeedsInfo,
  ready: styles.statusApproved,
  rejected: styles.statusRejected,
  cancelled: styles.statusCancelled,
};

const scheduleKindLabels: Record<ScheduleKind, string> = {
  LECTURE: "Лекция",
  SEMINAR: "Семинар",
  PRACTICE: "Практика",
};

const quickActionIcons = {
  schedule: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4m8-4v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </>
  ),
  grades: (
    <path d="M4 20V4m0 16h16M8 16v-4m4 4V8m4 8v-6m4 10V6" />
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </>
  ),
};

const welcomeDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

type QuickActionName = keyof typeof quickActionIcons;

function QuickActionIcon({ name }: { name: QuickActionName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {quickActionIcons[name]}
    </svg>
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
      <div
        className={`${styles.skeletonGrid} ${styles.skeletonHeroGrid}`}
        aria-hidden="true"
      >
        <span className={styles.skeletonHero} />
        <div className={styles.skeletonSideStack}>
          <span className={styles.skeletonCard} />
          <span className={styles.skeletonCard} />
        </div>
      </div>
      <div
        className={`${styles.skeletonGrid} ${styles.skeletonActivityGrid}`}
        aria-hidden="true"
      >
        <span className={styles.skeletonCard} />
        <span className={styles.skeletonCard} />
      </div>
      <div aria-hidden="true" className={styles.skeletonActions}>
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}

async function CampusToday() {
  await connection();
  const [data, academicRecords] = await Promise.all([
    getCampusTodayData(),
    getAcademicRecords(),
  ]);
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
                session.date.toISOString().slice(0, 10) >=
                  getMoscowDateKey(data.now) &&
                (!item.result ||
                  (item.result.status === "ACADEMIC_DEBT" &&
                    session.date > item.result.date)),
            )
            .map((session) => ({
              id: `session-${session.id}`,
              title: item.name,
              subject: `${controlTypeLabels[item.controlType]} · ${session.startTime.toISOString().slice(11, 16)}`,
              date: session.date.toISOString().slice(0, 10),
              countdown: getSessionCountdown(
                session.date.toISOString().slice(0, 10),
                session.startTime.toISOString().slice(11, 16),
                getMoscowDateKey(data.now),
                formatMoscowTime(data.now),
              ),
              href: `/schedule?section=session&event=${session.id}`,
            })),
        ),
      )
      .sort((first, second) => first.date.localeCompare(second.date)) ?? [];
  const deadlineRows = [
    ...data.deadlines.map((deadline) => ({
      id: deadline.id,
      title: deadline.title,
      subject: deadline.subject,
      sortDate: getMoscowDateKey(deadline.dueAt),
      dateLabel: formatMoscowDate(deadline.dueAt),
      countdown: deadline.countdown.label,
      tone: getDeadlineCountdownTone(deadline.countdown),
      href: `/deadlines#deadline-${deadline.id}`,
    })),
    ...sessionDeadlines.map((deadline) => ({
      id: deadline.id,
      title: deadline.title,
      subject: deadline.subject,
      sortDate: deadline.date,
      dateLabel: formatMoscowDate(new Date(`${deadline.date}T12:00:00.000Z`)),
      countdown: deadline.countdown,
      tone: deadline.countdown === "Сегодня"
        ? "warning" as const
        : deadline.countdown.startsWith("завтра")
          ? "danger" as const
          : "neutral" as const,
      href: deadline.href,
    })),
  ]
    .sort((first, second) => first.sortDate.localeCompare(second.sortDate))
    .slice(0, 3);
  const todayDate = new Date(`${data.week.todayKey}T00:00:00.000Z`);
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
        <div className={styles.welcomeContent}>
          <h1 id="welcome-title">
            {getCampusGreeting(data.now)}, {firstName}
          </h1>
          <div className={styles.welcomeMeta}>
            <p className={styles.eyebrow}>
              {welcomeDateFormatter.format(todayDate)} · группа{" "}
              {getStudentFacingGroupName(data.student.group.name)}
            </p>
            <Link className={styles.notificationLink} href="/notifications">
              {data.unreadNotificationCount > 0 && (
                <span aria-hidden="true" className={styles.notificationDot} />
              )}
              {data.unreadNotificationCount > 0
                ? `${data.unreadNotificationCount} новых уведомлений`
                : "Уведомления"}
            </Link>
          </div>
        </div>
      </section>

      <div className={`${styles.dashboardGrid} ${styles.heroGrid}`}>
        <section
          className={styles.nextLesson}
          aria-labelledby="next-lesson-title"
        >
          <div className={styles.heroArt} aria-hidden="true" />
          <div className={styles.heroContent}>
            <div className={styles.heroMain}>
              <span className={styles.heroBadge}>
                {hero.kind === "current"
                  ? "Идёт сейчас"
                  : hero.kind === "next"
                    ? "Следующая пара"
                    : "Ближайшее занятие"}
              </span>
              {hero.lesson ? (
                <div className={styles.lesson}>
                  <h2
                    id="next-lesson-title"
                    title={
                      hero.kind === "upcoming"
                        ? hero.hasTodayLessons
                          ? "На сегодня пары закончились"
                          : "Сегодня занятий нет"
                        : hero.lesson.subject.name
                    }
                  >
                    {hero.kind === "upcoming"
                      ? hero.hasTodayLessons
                        ? "На сегодня пары закончились"
                        : "Сегодня занятий нет"
                      : hero.lesson.subject.name}
                  </h2>
                  {hero.kind === "upcoming" ? (
                    <div className={styles.nextLessonPreview}>
                      <p>
                        Следующее: {formatCampusDate(hero.lesson.occurrenceDate)}
                        {" · "}
                        {formatCampusTime(hero.lesson.startTime)}
                      </p>
                      <strong title={hero.lesson.subject.name}>
                        {hero.lesson.subject.name}
                      </strong>
                      <span
                        title={`${scheduleKindLabels[hero.lesson.kind]} · ауд. ${hero.lesson.room} · ${hero.lesson.teacher}`}
                      >
                        {scheduleKindLabels[hero.lesson.kind]} · ауд.{" "}
                        {hero.lesson.room} · {hero.lesson.teacher}
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className={styles.lessonTime}>
                        {formatCampusTime(hero.lesson.startTime)}–
                        {formatCampusTime(hero.lesson.endTime)} ·{" "}
                        {scheduleKindLabels[hero.lesson.kind]}
                      </p>
                      <p
                        title={`Ауд. ${hero.lesson.room} · ${hero.lesson.teacher}`}
                      >
                        Ауд. {hero.lesson.room} · {hero.lesson.teacher}
                      </p>
                    </>
                  )}
                  {hero.countdown && (
                    <p className={styles.lessonCountdown}>{hero.countdown}</p>
                  )}
                </div>
              ) : (
                <div className={styles.heroEmpty}>
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
            </div>
            {sessionDeadlines[0] && (
              <div
                aria-label="Ближайшее событие сессии"
                className={styles.heroSession}
              >
                <span className={styles.heroSessionBadge}>
                  {sessionDeadlines[0].subject.split(" · ", 1)[0]}
                </span>
                <div className={styles.heroSessionDetails}>
                  <strong title={sessionDeadlines[0].title}>
                    {sessionDeadlines[0].title}
                  </strong>
                  <span>
                    {formatMoscowDate(
                      new Date(`${sessionDeadlines[0].date}T12:00:00.000Z`),
                    )}{" "}
                    · {sessionDeadlines[0].subject} ·{" "}
                    {sessionDeadlines[0].countdown}
                  </span>
                </div>
                <Link
                  aria-label={`Открыть событие сессии: ${sessionDeadlines[0].title}`}
                  className={styles.heroSessionLink}
                  href={sessionDeadlines[0].href}
                >
                  Подробнее
                </Link>
              </div>
            )}
            <div className={styles.heroActions}>
              <Link className={styles.heroButton} href="/schedule">
                Открыть расписание
              </Link>
              {hero.lesson && (
                <Link
                  className={`${styles.heroButton} ${styles.heroButtonSecondary}`}
                  href={`/schedule?view=week&date=${hero.lesson.occurrenceDate.toISOString().slice(0, 10)}`}
                >
                  Подробнее
                </Link>
              )}
            </div>
          </div>
        </section>

        <div className={styles.sideStack}>
          <section className={styles.card} aria-labelledby="deadlines-title">
            <div className={styles.cardHeading}>
              <p className={styles.eyebrow}>Скоро нужно сделать</p>
              <h2 id="deadlines-title">Ближайшие дедлайны</h2>
            </div>
            {deadlineRows.length ? (
              <ul className={styles.compactList}>
                {deadlineRows.map((deadline) => (
                  <DeadlineListItem
                    countdown={deadline.countdown}
                    dateLabel={deadline.dateLabel}
                    href={deadline.href}
                    key={deadline.id}
                    subject={deadline.subject}
                    title={deadline.title}
                    tone={deadline.tone}
                  />
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>
                <span aria-hidden="true" className={styles.emptyStateIcon}>
                  <QuickActionIcon name="schedule" />
                </span>
                <strong>Ближайших сроков нет</strong>
              </div>
            )}
            {data.overdueDeadlineCount > 0 && (
              <p className={styles.overdueSummary}>
                Просрочено: {data.overdueDeadlineCount} ·{" "}
                <Link
                  aria-label="Показать просроченные задания"
                  href={
                    data.firstOverdueDeadlineId
                      ? `/deadlines#deadline-${data.firstOverdueDeadlineId}`
                      : "/deadlines"
                  }
                >
                  показать
                </Link>
              </p>
            )}
            <Link className={styles.textLink} href="/deadlines">
              Все сроки →
            </Link>
          </section>

          <section className={styles.card} aria-labelledby="request-title">
            <div className={styles.cardHeading}>
              <p className={styles.eyebrow}>Последнее обращение</p>
              <h2 id="request-title">Моя последняя заявка</h2>
            </div>
            {data.latestRequest ? (
              <div className={styles.request}>
                <strong
                  title={getRequestCatalogTitle(
                    data.latestRequest.catalogCode,
                    requestTypeLabels[data.latestRequest.type],
                  )}
                >
                  {getRequestCatalogTitle(
                    data.latestRequest.catalogCode,
                    requestTypeLabels[data.latestRequest.type],
                  )}
                </strong>
                <span
                  className={`${styles.statusBadge} ${
                    requestStatusClasses[
                      getRequestStatusTone(data.latestRequest.status)
                    ]
                  }`}
                >
                  {requestStatusLabels[data.latestRequest.status]}
                </span>
                <p className={styles.requestMeta}>
                  {formatRequestNumber(data.latestRequest.id)} · обновлена{" "}
                  {formatMoscowDate(data.latestRequest.updatedAt)}
                </p>
                <Link
                  className={styles.textLink}
                  href={`/requests/${data.latestRequest.publicId}`}
                >
                  Отследить заявку ↗
                </Link>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>Заявок пока нет</strong>
                <Link className={styles.newRequestButton} href="/requests/new">
                  Новая заявка
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className={`${styles.dashboardGrid} ${styles.activityGrid}`}>
        <section className={styles.card} aria-labelledby="today-schedule-title">
          <div className={styles.cardHeading}>
            <p className={styles.eyebrow}>Пары и занятия</p>
            <h2 id="today-schedule-title">Расписание на сегодня</h2>
          </div>
          {data.todaySchedule.length ? (
            <ol className={styles.timeline}>
              {data.todaySchedule.map((lesson) => (
                <li
                  className={`${styles.timelineItem} ${
                    lesson.occurrenceId === activeLessonId
                      ? styles.timelineCurrent
                      : lesson.occurrenceId === nextLessonId
                        ? styles.timelineNext
                        : lesson.endTime.getTime() <= data.now.getTime() &&
                            lesson.status !== "CANCELLED"
                          ? styles.timelinePast
                          : ""
                  } ${
                    lesson.status === "CANCELLED"
                      ? styles.timelineCancelled
                      : ""
                  }`}
                  key={lesson.occurrenceId}
                >
                  <time dateTime={lesson.startTime.toISOString()}>
                    {formatCampusTime(lesson.startTime)}
                  </time>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  <div className={styles.timelineDetails}>
                    <strong title={lesson.subject.name}>
                      {lesson.subject.name}
                    </strong>
                    <span
                      title={`${scheduleKindLabels[lesson.kind]} · ауд. ${lesson.room}${lesson.status === "RESCHEDULED" ? " · перенесено" : ""}${lesson.status === "CANCELLED" ? " · отменено" : ""}`}
                    >
                      {scheduleKindLabels[lesson.kind]} · ауд. {lesson.room}
                      {lesson.status === "RESCHEDULED" && " · перенесено"}
                      {lesson.status === "CANCELLED" && " · отменено"}
                    </span>
                    {lesson.occurrenceId === activeLessonId && (
                      <span className={styles.timelineBadge}>Сейчас</span>
                    )}
                    {lesson.status === "CANCELLED" && (
                      <span className={styles.timelineStatusCancelled}>
                        Отменено
                      </span>
                    )}
                    {lesson.status === "RESCHEDULED" && (
                      <span className={styles.timelineStatusChanged}>
                        Перенесено
                      </span>
                    )}
                    {lesson.occurrenceId === nextLessonId && (
                      <span className={styles.timelineBadge}>Далее</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.emptySchedule}>
              <span aria-hidden="true" className={styles.emptyScheduleIcon}>
                <svg
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                  viewBox="0 0 24 24"
                >
                  <rect x="3.5" y="5" width="17" height="16" rx="2" />
                  <path d="M8 3v4m8-4v4M3.5 10h17" />
                </svg>
              </span>
              <div className={styles.emptyScheduleText}>
                <strong>На сегодня занятий нет</strong>
                <Link href="/schedule?view=week">Показать неделю →</Link>
              </div>
            </div>
          )}
          {!data.todaySchedule.length && data.nextLesson && (
            <div className={styles.nextDayLesson}>
              <span className={styles.eyebrow}>Ближайшее занятие</span>
              <strong title={data.nextLesson.subject.name}>
                {data.nextLesson.subject.name}
              </strong>
              <span>
                {formatCampusDate(data.nextLesson.occurrenceDate)} ·{" "}
                {formatCampusTime(data.nextLesson.startTime)} · ауд.{" "}
                {data.nextLesson.room}
              </span>
            </div>
          )}
          <Link className={styles.cardFooterLink} href="/schedule">
            Все занятия →
          </Link>
        </section>

        <section className={styles.card} aria-labelledby="announcements-title">
          <div className={styles.cardHeading}>
            <p className={styles.eyebrow}>Важное</p>
            <h2 id="announcements-title">Объявления</h2>
          </div>
          {data.changes.length ? (
            <ul className={styles.changeList}>
              {data.changes.map((change, index) => (
                <li
                  className={`${styles.changeItem} ${
                    index === 0 ? styles.highlightedChange : ""
                  }`}
                  key={change.id}
                >
                  <span className={styles.changeKind}>{change.kind}</span>
                  <strong title={change.title}>{change.title}</strong>
                  <p title={change.text}>{change.text}</p>
                  <time>{formatMoscowDate(change.date)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>Объявлений пока нет.</p>
          )}
          <Link className={styles.cardFooterLink} href="/notifications">
            Все объявления →
          </Link>
        </section>
      </div>

      <section
        className={styles.quickActionsSection}
        aria-labelledby="quick-actions-title"
      >
        <div className={styles.cardHeading}>
          <p className={styles.eyebrow}>Часто используемое</p>
          <h2 id="quick-actions-title">Быстрые действия</h2>
        </div>
        <nav className={styles.quickActions} aria-label="Быстрые действия">
          {(
            [
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
            ] as const
          ).map((action) => (
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

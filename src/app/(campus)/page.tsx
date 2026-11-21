import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { ScheduleKind } from "@/generated/prisma/enums";
import { getCampusTodayData } from "@/lib/campus-data";
import { getStudentFacingGroupName } from "@/lib/campus-labels";
import {
  formatCampusDate,
  formatCampusTime,
  formatMoscowDate,
  getCampusGreeting,
} from "@/lib/campus-time";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getRequestCatalogTitle } from "@/lib/request-catalog";
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
      <div className={styles.skeletonGrid} aria-hidden="true">
        <span className={styles.skeletonHero} />
        <span className={styles.skeletonCard} />
        <span className={styles.skeletonCard} />
      </div>
    </main>
  );
}

async function CampusToday() {
  await connection();
  const data = await getCampusTodayData();
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
          <h1 id="welcome-title">
            {getCampusGreeting(data.now)}, {firstName}
          </h1>
        </div>
      </section>

      <div className={styles.dashboardGrid}>
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
                  <h2 id="next-lesson-title">
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
                      <strong>{hero.lesson.subject.name}</strong>
                      <span>
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
                      <p>
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
            <div className={styles.heroActions}>
              <Link className={styles.heroButton} href="/schedule">
                Открыть расписание
              </Link>
            </div>
          </div>
        </section>

        <div className={styles.sideStack}>
          <section className={styles.card} aria-labelledby="deadlines-title">
            <div className={styles.cardHeading}>
              <p className={styles.eyebrow}>Скоро нужно сделать</p>
              <h2 id="deadlines-title">Ближайшие дедлайны</h2>
            </div>
            {data.deadlines.length ? (
              <ul className={styles.compactList}>
                {data.deadlines.slice(0, 3).map((deadline) => (
                  <li className={styles.deadlineItem} key={deadline.id}>
                    <span className={styles.deadlineIcon} aria-hidden="true">
                      <QuickActionIcon name="grades" />
                    </span>
                    <span className={styles.deadlineDetails}>
                      <strong>{deadline.title}</strong>
                      <small>
                        {deadline.subject} · {formatMoscowDate(deadline.dueAt)}
                      </small>
                    </span>
                    <span
                      className={`${styles.deadlineTime} ${
                        deadline.countdown.kind === "OVERDUE" ||
                        deadline.countdown.daysRemaining <= 3
                          ? styles.deadlineOverdue
                          : ""
                      }`}
                    >
                      {deadline.countdown.kind === "UPCOMING" &&
                      deadline.countdown.daysRemaining <= 3
                        ? deadline.countdown.label.replace(
                            /^Осталось /,
                            "Через ",
                          )
                        : deadline.countdown.label}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>
                <strong>Дедлайнов пока нет</strong>
                <p>Открытых заданий и сроков нет.</p>
              </div>
            )}
            <Link className={styles.textLink} href="/deadlines">
              Все задания и сроки
            </Link>
          </section>

          <section className={styles.card} aria-labelledby="request-title">
            <div className={styles.cardHeading}>
              <p className={styles.eyebrow}>Последнее обращение</p>
              <h2 id="request-title">Моя последняя заявка</h2>
            </div>
            {data.latestRequest ? (
              <div className={styles.request}>
                <strong>
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
                  № {data.latestRequest.publicId.slice(0, 8).toUpperCase()} ·
                  {" "}обновлена {formatMoscowDate(data.latestRequest.updatedAt)}
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
                <Link className={styles.textLink} href="/requests/new">
                  Новая заявка
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <section className={styles.card} aria-labelledby="today-schedule-title">
          <div className={styles.cardHeading}>
            <p className={styles.eyebrow}>Пары и занятия</p>
            <div className={styles.cardTitleRow}>
              <h2 id="today-schedule-title">Расписание на сегодня</h2>
              <Link className={styles.cardHeaderLink} href="/schedule">
                Все занятия →
              </Link>
            </div>
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
                    <strong>{lesson.subject.name}</strong>
                    <span>
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
        </section>

        <section className={styles.card} aria-labelledby="announcements-title">
          <div className={styles.cardHeading}>
            <p className={styles.eyebrow}>Важное</p>
            <div className={styles.cardTitleRow}>
              <h2 id="announcements-title">Объявления</h2>
              <Link className={styles.cardHeaderLink} href="/notifications">
                Все объявления →
              </Link>
            </div>
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
                  <strong>{change.title}</strong>
                  <p>{change.text}</p>
                  <time>{formatMoscowDate(change.date)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>Объявлений пока нет.</p>
          )}
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
              { href: "/requests/new", label: "Заказать справку", name: "help" },
              { href: "/grades", label: "Рассчитать оценку", name: "grades" },
              { href: "/schedule", label: "Моё расписание", name: "schedule" },
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
              <span className={styles.actionLabel}>{action.label}</span>
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

import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { RequestStatus } from "@/generated/prisma/enums";
import { getCampusTodayData } from "@/lib/campus-data";
import {
  formatCampusTime,
  formatMoscowDate,
  getCampusGreeting,
} from "@/lib/campus-time";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getRequestCatalogTitle } from "@/lib/request-catalog";
import styles from "./page.module.css";

const requestStatusClasses: Record<RequestStatus, string> = {
  NEW: styles.statusPending,
  IN_PROGRESS: styles.statusInProgress,
  NEEDS_INFO: styles.statusNeedsInfo,
  READY: styles.statusApproved,
  REJECTED: styles.statusRejected,
  CANCELLED: styles.statusCancelled,
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
    <main className={styles.page} aria-busy="true">
      <p>Загружаем ваш план на день…</p>
    </main>
  );
}

async function CampusToday() {
  await connection();
  const data = await getCampusTodayData();
  const todayDate = new Date(`${data.week.todayKey}T00:00:00.000Z`);
  const firstName = data.student.fullName.split(" ")[0];

  return (
    <main className={styles.page}>
      <section className={styles.welcome} aria-labelledby="welcome-title">
        <div className={styles.welcomeContent}>
          <p className={styles.eyebrow}>
            {welcomeDateFormatter.format(todayDate)} · группа{" "}
            {data.student.group.name}
          </p>
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
            <span className={styles.heroBadge}>Ближайшая пара</span>
            {data.nextLesson ? (
              <div className={styles.lesson}>
                <h2 id="next-lesson-title">{data.nextLesson.subject.name}</h2>
                <p className={styles.lessonTime}>
                  {formatCampusTime(data.nextLesson.startTime)}–
                  {formatCampusTime(data.nextLesson.endTime)} · занятие
                </p>
                <p>
                  Аудитория {data.nextLesson.room} · {data.nextLesson.teacher}
                </p>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h2 id="next-lesson-title">
                  {data.todaySchedule.length
                    ? "Сегодня пар больше нет"
                    : "На сегодня занятий нет"}
                </h2>
                <p>
                {data.todaySchedule.length
                    ? "Посмотрите расписание на другие дни."
                    : "В расписании пока нет ближайших занятий."}
                </p>
              </div>
            )}
            <Link className={styles.heroButton} href="/schedule">
              Открыть расписание
            </Link>
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
                        deadline.countdown.kind === "OVERDUE"
                          ? styles.deadlineOverdue
                          : ""
                      }`}
                    >
                      {deadline.countdown.label}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>
                <p>Открытых заданий и сроков пока нет.</p>
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
                  className={`${styles.statusBadge} ${requestStatusClasses[data.latestRequest.status]}`}
                >
                  {requestStatusLabels[data.latestRequest.status]}
                </span>
                <p>
                  Обновлена {formatMoscowDate(data.latestRequest.updatedAt)}
                </p>
                <Link className={styles.textLink} href="/requests">
                  Отследить заявку ↗
                </Link>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>
                  У вас пока нет заявок. Здесь появится статус, когда заявка
                  будет подана.
                </p>
                <Link className={styles.textLink} href="/requests/new">
                  Создать первую заявку
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
            <h2 id="today-schedule-title">Расписание на сегодня</h2>
          </div>
          {data.todaySchedule.length ? (
            <ol className={styles.timeline}>
              {data.todaySchedule.map((lesson) => (
                <li className={styles.timelineItem} key={lesson.occurrenceId}>
                  <time>{formatCampusTime(lesson.startTime)}</time>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  <div className={styles.timelineDetails}>
                    <strong>{lesson.subject.name}</strong>
                    <span>
                      Занятие · ауд. {lesson.room}
                      {lesson.status === "RESCHEDULED" && " · перенесено"}
                      {lesson.status === "CANCELLED" && " · отменено"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.emptyState}>На сегодня занятий нет.</p>
          )}
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
                  <strong>{change.title}</strong>
                  <p>{change.text}</p>
                  <time>{formatMoscowDate(change.date)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>
              Новых объявлений и изменений пока нет.
            </p>
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

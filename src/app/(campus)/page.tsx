import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { RequestStatus } from "@/generated/prisma/enums";
import { getCampusTodayData } from "@/lib/campus-data";
import {
  formatCampusDate,
  formatCampusTime,
  formatMoscowDate,
  formatRemainingMoscowDays,
  getCampusGreeting,
  getCampusTime,
} from "@/lib/campus-time";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import styles from "./page.module.css";

const requestStatusClasses: Record<RequestStatus, string> = {
  NEW: styles.statusPending,
  IN_PROGRESS: styles.statusInProgress,
  NEEDS_INFO: styles.statusNeedsInfo,
  READY: styles.statusApproved,
  REJECTED: styles.statusRejected,
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
  notifications: (
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" />
  ),
};

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
        <div>
          <p className={styles.eyebrow}>
            {formatCampusDate(todayDate)} · {getCampusTime()} МСК
          </p>
          <h1 id="welcome-title">
            {getCampusGreeting(data.now)}, {firstName}!
          </h1>
          <p className={styles.welcomeText}>
            Ваша группа: <strong>{data.student.group.name}</strong>
          </p>
        </div>
      </section>

      <nav className={styles.quickActions} aria-label="Быстрые действия">
        {(
          [
            { href: "/schedule", label: "Расписание", name: "schedule" },
            { href: "/grades", label: "Оценки", name: "grades" },
            { href: "/requests/new", label: "Справка", name: "help" },
            {
              href: "/notifications",
              label: "Уведомления",
              name: "notifications",
            },
          ] as const
        ).map((action) => (
          <Link
            aria-label={
              action.name === "notifications" &&
              data.unreadNotificationCount > 0
                ? `Уведомления, непрочитанных: ${data.unreadNotificationCount}`
                : undefined
            }
            className={styles.actionTile}
            href={action.href}
            key={action.name}
          >
            <span className={styles.actionIcon}>
              <QuickActionIcon name={action.name} />
              {action.name === "notifications" &&
                data.unreadNotificationCount > 0 && (
                  <span className={styles.unreadBadge}>
                    {data.unreadNotificationCount}
                  </span>
                )}
            </span>
            <span className={styles.actionLabel}>{action.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.dashboardGrid}>
        <section className={styles.card} aria-labelledby="next-lesson-title">
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.eyebrow}>Ближайшее занятие</p>
              <h2 id="next-lesson-title">Следующая пара</h2>
            </div>
          </div>
          {data.nextLesson ? (
            <div className={styles.lesson}>
              <strong>{data.nextLesson.subject.name}</strong>
              <p>
                {formatCampusDate(data.nextLesson.occurrenceDate)} ·{" "}
                {formatCampusTime(data.nextLesson.startTime)}–
                {formatCampusTime(data.nextLesson.endTime)}
              </p>
              <p>Аудитория {data.nextLesson.room}</p>
              <p>Преподаватель: {data.nextLesson.teacher}</p>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>
                {data.todaySchedule.length
                  ? "Сегодня пар больше нет."
                  : "На сегодня занятий нет."}{" "}
                В расписании пока не найдена следующая пара.
              </p>
              <Link className={styles.textLink} href="/schedule">
                Открыть расписание
              </Link>
            </div>
          )}
        </section>

        <section className={styles.card} aria-labelledby="deadlines-title">
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.eyebrow}>Скоро нужно сделать</p>
              <h2 id="deadlines-title">Ближайшие дедлайны</h2>
            </div>
          </div>
          {data.deadlines.length ? (
            <ul className={styles.compactList}>
              {data.deadlines.map((deadline) => (
                <li className={styles.deadlineItem} key={deadline.id}>
                  <span>{deadline.title}</span>
                  <span className={styles.deadlineTime}>
                    {deadline.deadline
                      ? formatRemainingMoscowDays(deadline.deadline, data.now)
                      : "Срок не указан"}
                    {deadline.deadline && (
                      <small>{formatMoscowDate(deadline.deadline)}</small>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <p>
                На ближайшие дни дедлайнов нет. Здесь появятся задачи со сроком
                сдачи.
              </p>
              <Link className={styles.textLink} href="/notifications">
                Проверить уведомления
              </Link>
            </div>
          )}
        </section>

        <section className={styles.card} aria-labelledby="changes-title">
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.eyebrow}>Расписание и новости</p>
              <h2 id="changes-title">Изменения</h2>
            </div>
          </div>
          {data.changes.length ? (
            <ul className={styles.changeList}>
              {data.changes.map((change) => (
                <li className={styles.changeItem} key={change.id}>
                  <span className={styles.changeKind}>{change.kind}</span>
                  <strong>{change.title}</strong>
                  <p>{change.text}</p>
                  <time>{formatMoscowDate(change.date)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>
              Переносов занятий и свежих объявлений пока нет.
            </p>
          )}
        </section>

        <section className={styles.card} aria-labelledby="request-title">
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.eyebrow}>Последнее обращение</p>
              <h2 id="request-title">Моя заявка</h2>
            </div>
          </div>
          {data.latestRequest ? (
            <div className={styles.request}>
              <strong>{requestTypeLabels[data.latestRequest.type]}</strong>
              <span
                className={`${styles.statusBadge} ${requestStatusClasses[data.latestRequest.status]}`}
              >
                {requestStatusLabels[data.latestRequest.status]}
              </span>
              <p>Обновлена {formatMoscowDate(data.latestRequest.updatedAt)}</p>
              <Link className={styles.textLink} href="/requests">
                Открыть заявки
              </Link>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>
                У вас пока нет заявок. Здесь появится статус, когда заявка будет
                подана.
              </p>
              <Link className={styles.textLink} href="/requests/new">
                Новая заявка
              </Link>
            </div>
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

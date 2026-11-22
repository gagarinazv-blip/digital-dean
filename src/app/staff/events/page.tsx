import { SectionHeader } from "@/components/section-header";
import { DateTimeStack } from "@/components/date-time-stack";
import { Suspense } from "react";
import { connection } from "next/server";
import { CampusLoading } from "@/components/campus-section";
import { getDemoNow } from "@/lib/demo-date";
import { eventStatusLabels, eventTypeLabels } from "@/lib/event-constants";
import {
  formatDigestWeekRange,
  getDigestWeek,
  getDigestWeekHref,
  getDigestWeekKey,
  groupEventsByStartDay,
} from "@/lib/event-digest";
import { getStaffDigestEvents } from "@/lib/event-data";
import { requireStaffContext } from "@/lib/staff";
import {
  copyEventToNextWeekAction,
  updateEventAction,
} from "./actions";
import {
  CopyEventButton,
  EventDeleteDialog,
  EventForm,
} from "./event-form";
import { EventCreatePanel } from "./event-create-panel";
import styles from "./events.module.css";

type StaffEventsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function StaffEventsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  await requireStaffContext();
  const now = getDemoNow();
  const week = getDigestWeek(getSingleParam(params.week), now);
  const currentWeek = getDigestWeek(undefined, now);
  const events = await getStaffDigestEvents(week.startInstant, week.endInstant);
  const days = groupEventsByStartDay(week, events);
  const weekKey = getDigestWeekKey(week);

  return (
    <main className={styles.page}>
      <SectionHeader
        description={`${formatDigestWeekRange(week)} · события и черновики`}
        eyebrow="Рабочее место"
        illustration="events"
        title="Дайджест событий"
        tone="wine"
      />

      <section className={styles.workspace}>
        <EventCreatePanel />
        <nav className={styles.weekNavigation} aria-label="Выбор недели">
          <a href={getDigestWeekHref(week, -1)}>
            <span aria-hidden="true">←</span> Предыдущая
          </a>
          <a
            aria-current={weekKey === getDigestWeekKey(currentWeek) ? "date" : undefined}
            href={getDigestWeekHref(currentWeek, 0)}
          >
            Эта неделя
          </a>
          <a href={getDigestWeekHref(week, 1)}>
            Следующая <span aria-hidden="true">→</span>
          </a>
        </nav>

        <div className={styles.weekGrid}>
          {days.map((day) => (
            <section
              aria-labelledby={`staff-events-day-${day.dateKey}`}
              className={styles.day}
              data-has-events={day.events.length > 0}
              key={day.dateKey}
            >
              <header className={styles.dayHeader}>
                <h2 id={`staff-events-day-${day.dateKey}`}>{day.dateLabel}</h2>
                <span>{day.events.length}</span>
              </header>
              {day.events.length === 0 ? (
                <p className={styles.noDayEvents}>Событий нет</p>
              ) : (
                <ul className={styles.eventList}>
                  {day.events.map((event) => (
                    <li className={styles.eventCard} key={event.id}>
                      <div className={styles.eventTopline}>
                        <DateTimeStack
                          end={event.endsAt}
                          value={event.startsAt}
                        />
                        <span
                          className={styles.statusBadge}
                          data-status={event.status}
                        >
                          {eventStatusLabels[event.status]}
                        </span>
                      </div>
                      <h3>{event.title}</h3>
                      <p className={styles.eventMeta}>
                        {eventTypeLabels[event.type]} · {event.location} ·{" "}
                        {event.host}
                      </p>
                      {event.registrationUrl ? (
                        <a
                          className={styles.externalLink}
                          href={event.registrationUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Ссылка регистрации
                        </a>
                      ) : null}
                      <div className={styles.eventActions}>
                        <details className={styles.editPanel}>
                          <summary className={styles.secondaryButton}>
                            Редактировать
                          </summary>
                          <EventForm
                            action={updateEventAction}
                            event={event}
                            submitLabel="Сохранить изменения"
                          />
                        </details>
                        <form action={copyEventToNextWeekAction}>
                          <input
                            name="eventId"
                            type="hidden"
                            value={event.id}
                          />
                          <CopyEventButton />
                        </form>
                        <EventDeleteDialog
                          eventId={event.id}
                          title={event.title}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        {events.length === 0 ? (
          <p className={styles.emptyState}>На этой неделе событий пока нет.</p>
        ) : null}
      </section>
    </main>
  );
}

export default function StaffEventsPage({
  searchParams,
}: StaffEventsPageProps) {
  return (
    <Suspense fallback={<CampusLoading label="Дайджест событий" />}>
      <StaffEventsContent searchParams={searchParams ?? Promise.resolve({})} />
    </Suspense>
  );
}

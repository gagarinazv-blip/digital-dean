import { DateTimeStack } from "@/components/date-time-stack";
import { Suspense } from "react";
import { connection } from "next/server";
import { CampusSection } from "@/components/campus-section";
import { getDemoNow } from "@/lib/demo-date";
import {
  eventTypeLabels,
  eventTypeValues,
  isEventType,
} from "@/lib/event-constants";
import {
  formatDigestWeekRange,
  getDigestWeek,
  getDigestWeekHref,
  getDigestWeekKey,
  groupEventsByStartDay,
} from "@/lib/event-digest";
import { getPublishedDigestEvents } from "@/lib/event-data";
import { getMoscowDateKey } from "@/lib/campus-time";
import styles from "./digest.module.css";

type DigestPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const instant = false;

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isSafeRegistrationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function DigestContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const now = getDemoNow();
  const week = getDigestWeek(getSingleParam(params.week), now);
  const currentWeek = getDigestWeek(undefined, now);
  const rawType = getSingleParam(params.type);
  const eventType = isEventType(rawType) ? rawType : undefined;
  const events = await getPublishedDigestEvents(
    week.startInstant,
    week.endInstant,
    eventType,
  );
  const days = groupEventsByStartDay(week, events);
  const todayKey = getMoscowDateKey(now);
  const weekKey = getDigestWeekKey(week);

  return (
    <CampusSection
      eyebrow="Внеучебная жизнь"
      title="Дайджест событий"
      illustration="digest"
      tone="wine"
      description={`Неделя · ${formatDigestWeekRange(week)}`}
    >
      <div className={styles.workspace}>
        <nav className={styles.weekNavigation} aria-label="Выбор недели">
          <a href={getDigestWeekHref(week, -1, eventType)}>
            <span aria-hidden="true">←</span> Предыдущая
          </a>
          <a
            aria-current={weekKey === getDigestWeekKey(currentWeek) ? "date" : undefined}
            className={styles.currentWeek}
            href={getDigestWeekHref(currentWeek, 0, eventType)}
          >
            Эта неделя
          </a>
          <a href={getDigestWeekHref(week, 1, eventType)}>
            Следующая <span aria-hidden="true">→</span>
          </a>
        </nav>

        <form action="/digest" className={styles.filters}>
          <input name="week" type="hidden" value={weekKey} />
          <label htmlFor="digest-type-filter">Тип события</label>
          <select
            defaultValue={eventType ?? ""}
            id="digest-type-filter"
            name="type"
          >
            <option value="">Все типы</option>
            {eventTypeValues.map((type) => (
              <option key={type} value={type}>
                {eventTypeLabels[type]}
              </option>
            ))}
          </select>
          <button className={styles.filterButton} type="submit">
            Применить
          </button>
        </form>

        {events.length === 0 ? (
          <div className={styles.emptyState} role="status">
            На этой неделе мероприятий пока нет
          </div>
        ) : (
          <div className={styles.weekGrid}>
            {days.map((day) => {
              const isToday = day.dateKey === todayKey;
              return (
                <section
                  aria-labelledby={`digest-day-${day.dateKey}`}
                  className={styles.day}
                  data-has-events={day.events.length > 0}
                  data-today={isToday}
                  key={day.dateKey}
                >
                  <header className={styles.dayHeader}>
                    <h2 id={`digest-day-${day.dateKey}`}>{day.dateLabel}</h2>
                    {isToday ? (
                      <span className={styles.todayBadge}>Сегодня</span>
                    ) : null}
                  </header>
                  {day.events.length === 0 ? (
                    <p className={styles.noDayEvents}>В этот день мероприятий нет</p>
                  ) : (
                    <ul className={styles.eventList}>
                      {day.events.map((event) => {
                        const isPast = event.endsAt <= now;
                        const canRegister =
                          event.registrationUrl !== null &&
                          isSafeRegistrationUrl(event.registrationUrl);
                        return (
                          <li
                            className={styles.eventCard}
                            data-past={isPast}
                            data-type={event.type}
                            key={event.id}
                          >
                            <div className={styles.eventTopline}>
                              <DateTimeStack
                                end={event.endsAt}
                                value={event.startsAt}
                              />
                              <span className={styles.typeBadge}>
                                {eventTypeLabels[event.type]}
                              </span>
                            </div>
                            <h3>{event.title}</h3>
                            <dl className={styles.eventDetails}>
                              <div>
                                <dt>Аудитория</dt>
                                <dd>{event.location}</dd>
                              </div>
                              <div>
                                <dt>Кто проводит</dt>
                                <dd>{event.host}</dd>
                              </div>
                            </dl>
                            {event.description ? (
                              <details className={styles.description}>
                                <summary>Подробнее</summary>
                                <p>{event.description}</p>
                              </details>
                            ) : null}
                            {canRegister ? (
                              <a
                                className={styles.registerButton}
                                href={event.registrationUrl ?? undefined}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                Зарегистрироваться
                                <span aria-hidden="true">↗</span>
                              </a>
                            ) : (
                              <button
                                className={styles.registerButton}
                                disabled
                                type="button"
                              >
                                Регистрация пока недоступна
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </CampusSection>
  );
}

function DigestFallback() {
  return (
    <CampusSection
      eyebrow="Внеучебная жизнь"
      title="Дайджест событий"
      illustration="digest"
      tone="wine"
      description="Загружаем мероприятия недели."
    >
      <div aria-busy="true" className={styles.loading}>
        <span />
        <span />
        <span />
      </div>
    </CampusSection>
  );
}

export default function DigestPage({ searchParams }: DigestPageProps) {
  return (
    <Suspense fallback={<DigestFallback />}>
      <DigestContent searchParams={searchParams ?? Promise.resolve({})} />
    </Suspense>
  );
}

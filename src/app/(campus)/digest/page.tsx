import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowUpRight,
  Community,
  DesignPencil,
  MapPin,
  Microphone,
  NavArrowLeft,
  NavArrowRight,
  Sparks,
  User,
} from "iconoir-react";
import type { EventType } from "@/generated/prisma/enums";
import { CampusSection } from "@/components/campus-section";
import { EmptyState } from "@/components/empty-state";
import controls from "@/components/ui/controls.module.css";
import { formatMoscowTime, getMoscowDateKey } from "@/lib/campus-time";
import { formatStackDay } from "@/lib/date-stack";
import { getDemoNow } from "@/lib/demo-date";
import {
  eventTypeLabels,
  eventTypeValues,
  isEventType,
} from "@/lib/event-constants";
import {
  countPublishedDigestEvents,
  getPublishedDigestEvents,
  type PublishedEvent,
} from "@/lib/event-data";
import {
  formatDigestWeekRange,
  getDigestWeek,
  getDigestWeekHref,
  getDigestWeekKey,
  groupEventsByStartDay,
  shiftDigestWeek,
} from "@/lib/event-digest";
import { pluralize } from "@/lib/plural";
import styles from "./digest.module.css";

type DigestPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const instant = false;

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const typeIcons: Record<EventType, typeof Community> = {
  CONFERENCE: Community,
  SPEAKER_MEETING: Microphone,
  MASTER_CLASS: DesignPencil,
  OTHER: Sparks,
};

const eventForms = ["событие", "события", "событий"] as const;

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getSafeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function getTime(event: PublishedEvent): string {
  return `${formatMoscowTime(event.startsAt)}–${formatMoscowTime(event.endsAt)}`;
}

function isRunning(event: PublishedEvent, now: Date): boolean {
  return event.startsAt <= now && event.endsAt > now;
}

function EventFacts({ event }: { event: PublishedEvent }) {
  return (
    <ul className={styles.facts}>
      <li>
        <MapPin aria-hidden="true" />
        <span>{event.location}</span>
      </li>
      <li>
        <User aria-hidden="true" />
        <span>{event.host}</span>
      </li>
    </ul>
  );
}

function EntryAction({ event }: { event: PublishedEvent }) {
  const url = getSafeUrl(event.registrationUrl);
  return url ? (
    <a className={styles.register} href={url} rel="noopener noreferrer" target="_blank">
      Записаться <ArrowUpRight aria-hidden="true" />
      <span className={controls.visuallyHidden}> (откроется в новой вкладке)</span>
    </a>
  ) : (
    <span className={styles.entryNote}>Вход свободный</span>
  );
}

function EventRow({ event, now }: { event: PublishedEvent; now: Date }) {
  const Icon = typeIcons[event.type];
  const isPast = event.endsAt <= now;
  return (
    <li className={styles.event} data-past={isPast || undefined} data-type={event.type}>
      <span aria-hidden="true" className={styles.icon}>
        <Icon strokeWidth={1.6} />
      </span>
      <div className={styles.eventBody}>
        <p className={styles.kicker}>
          <time dateTime={event.startsAt.toISOString()}>{getTime(event)}</time>
          <span>{eventTypeLabels[event.type]}</span>
          {isRunning(event, now) ? <span className={styles.live}>Идёт сейчас</span> : null}
        </p>
        <h3>{event.title}</h3>
        <EventFacts event={event} />
        {event.description ? (
          <details className={styles.more}>
            <summary>О событии</summary>
            <p>{event.description}</p>
          </details>
        ) : null}
      </div>
      <div className={styles.entry}>
        {isPast ? <span className={styles.entryNote}>Прошло</span> : <EntryAction event={event} />}
      </div>
    </li>
  );
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
  const nextWeek = shiftDigestWeek(week, 1);
  const currentWeek = getDigestWeek(undefined, now);
  const weekKey = getDigestWeekKey(week);
  const isCurrentWeek = weekKey === getDigestWeekKey(currentWeek);
  const rawType = getSingleParam(params.type);
  const eventType = isEventType(rawType) ? rawType : undefined;
  const [weekEvents, nextWeekCount] = await Promise.all([
    getPublishedDigestEvents(week.startDate, nextWeek.startDate),
    countPublishedDigestEvents(nextWeek.startDate, shiftDigestWeek(week, 2).startDate),
  ]);

  const events = eventType
    ? weekEvents.filter((event) => event.type === eventType)
    : weekEvents;
  const days = groupEventsByStartDay(week, events);
  const todayKey = getMoscowDateKey(now);
  const upcoming = events.filter((event) => event.endsAt > now);
  const featured = upcoming[0];
  // Главное событие уже показано крупно, в списке дня его не повторяем.
  const listDays = days
    .map((day) => ({
      ...day,
      events: day.events.filter(
        (event) => event.endsAt > now && event.id !== featured?.id,
      ),
    }))
    .filter((day) => day.events.length > 0);
  const past = events.filter((event) => event.endsAt <= now);
  const FeaturedIcon = featured ? typeIcons[featured.type] : null;

  return (
    <CampusSection
      description={`${formatDigestWeekRange(week)} · ${weekEvents.length} ${pluralize(weekEvents.length, ...eventForms)}`}
      eyebrow="Внеучебная жизнь"
      illustration="digest"
      title="Дайджест событий"
      tone="wine"
    >
      <div className={styles.workspace}>
        <nav aria-label="Неделя" className={styles.week}>
          <Link
            aria-label="Предыдущая неделя"
            className={controls.iconButton}
            href={getDigestWeekHref(week, -1, eventType)}
          >
            <NavArrowLeft aria-hidden="true" />
          </Link>
          <ol className={styles.days}>
            {days.map((day, index) => {
              const content = (
                <>
                  <span>{weekdays[index]}</span>
                  <strong>{Number(day.dateKey.slice(8))}</strong>
                  <span aria-hidden="true" className={styles.dots}>
                    {day.events.slice(0, 3).map((event) => (
                      <i key={event.id} />
                    ))}
                  </span>
                </>
              );
              const label = `${day.dateLabel}: ${day.events.length} ${pluralize(day.events.length, ...eventForms)}`;
              const target =
                featured && getMoscowDateKey(featured.startsAt) === day.dateKey
                  ? "featured"
                  : listDays.some((item) => item.dateKey === day.dateKey)
                    ? `day-${day.dateKey}`
                    : day.events.length > 0
                      ? "past"
                      : null;
              return (
                <li aria-current={day.dateKey === todayKey ? "date" : undefined} key={day.dateKey}>
                  {target ? (
                    <a aria-label={label} className={styles.dayLink} href={`#${target}`} title={label}>
                      {content}
                    </a>
                  ) : (
                    <span className={styles.dayLink} title={label}>
                      {content}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <Link
            aria-label="Следующая неделя"
            className={controls.iconButton}
            href={getDigestWeekHref(week, 1, eventType)}
          >
            <NavArrowRight aria-hidden="true" />
          </Link>
        </nav>

        <div className={styles.toolbar}>
          <ul aria-label="Тип события" className={styles.filters}>
            <li>
              <Link
                aria-current={eventType ? undefined : "true"}
                className={styles.filter}
                href={getDigestWeekHref(week, 0)}
                scroll={false}
              >
                Все <span>{weekEvents.length}</span>
              </Link>
            </li>
            {eventTypeValues.map((type) => (
              <li key={type}>
                <Link
                  aria-current={eventType === type ? "true" : undefined}
                  className={styles.filter}
                  href={getDigestWeekHref(week, 0, type)}
                  scroll={false}
                >
                  {eventTypeLabels[type]}{" "}
                  <span>{weekEvents.filter((event) => event.type === type).length}</span>
                </Link>
              </li>
            ))}
          </ul>
          {isCurrentWeek ? null : (
            <Link className={styles.textLink} href={getDigestWeekHref(currentWeek, 0, eventType)}>
              К этой неделе
            </Link>
          )}
        </div>

        {featured && FeaturedIcon ? (
          <section aria-labelledby="featured-title" className={styles.featured} id="featured">
            <div className={styles.featuredText}>
              <p className={styles.kicker}>
                <span>{isRunning(featured, now) ? "Идёт сейчас" : "Ближайшее событие"}</span>
                <span>{eventTypeLabels[featured.type]}</span>
              </p>
              <h2 id="featured-title">{featured.title}</h2>
              {featured.description ? (
                <p className={styles.featuredDescription}>{featured.description}</p>
              ) : null}
              <EventFacts event={featured} />
            </div>
            <div className={styles.featuredWhen}>
              <span>{formatStackDay(featured.startsAt, now)}</span>
              <time dateTime={featured.startsAt.toISOString()}>{getTime(featured)}</time>
              <EntryAction event={featured} />
            </div>
            <FeaturedIcon aria-hidden="true" className={styles.featuredIcon} strokeWidth={0.8} />
          </section>
        ) : null}

        {listDays.map((day) => (
          <section
            aria-labelledby={`digest-day-${day.dateKey}`}
            className={styles.day}
            id={`day-${day.dateKey}`}
            key={day.dateKey}
          >
            <h2 className={styles.dayTitle} id={`digest-day-${day.dateKey}`}>
              <strong>{Number(day.dateKey.slice(8))}</strong>
              <span>
                {day.dateLabel.split(",")[0]}
                {day.dateKey === todayKey ? <em>Сегодня</em> : null}
              </span>
            </h2>
            <ul className={styles.events} data-stagger>
              {day.events.map((event) => (
                <EventRow event={event} key={event.id} now={now} />
              ))}
            </ul>
          </section>
        ))}

        {upcoming.length === 0 ? (
          <EmptyState
            action={
              nextWeekCount > 0 ? (
                <Link className={controls.primary} href={getDigestWeekHref(week, 1)}>
                  Следующая неделя: {nextWeekCount} {pluralize(nextWeekCount, ...eventForms)}
                </Link>
              ) : eventType && weekEvents.length > 0 ? (
                <Link className={controls.secondary} href={getDigestWeekHref(week, 0)}>
                  Показать все типы
                </Link>
              ) : undefined
            }
            art="digest"
            description={
              past.length > 0
                ? "Всё, что было на неделе, осталось ниже."
                : "Дайджест ещё готовится. Загляните позже."
            }
            illustration="schedule"
            title={past.length > 0 ? "На этой неделе всё прошло" : "Событий пока нет"}
          />
        ) : nextWeekCount > 0 ? (
          <Link className={styles.nextWeek} href={getDigestWeekHref(week, 1)}>
            <span>
              <strong>Что дальше</strong>
              {formatDigestWeekRange(nextWeek)} · {nextWeekCount}{" "}
              {pluralize(nextWeekCount, ...eventForms)}
            </span>
            <NavArrowRight aria-hidden="true" />
          </Link>
        ) : null}

        {past.length > 0 ? (
          <details className={styles.past} id="past">
            <summary>
              Уже прошло <span>{past.length}</span>
            </summary>
            <ul className={styles.events}>
              {past.map((event) => (
                <li className={styles.pastEvent} key={event.id}>
                  <span>{formatStackDay(event.startsAt, now)}</span>
                  <strong>{event.title}</strong>
                  <span>{eventTypeLabels[event.type]}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </CampusSection>
  );
}

function DigestFallback() {
  return (
    <CampusSection
      description="Загружаем события недели."
      eyebrow="Внеучебная жизнь"
      illustration="digest"
      title="Дайджест событий"
      tone="wine"
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

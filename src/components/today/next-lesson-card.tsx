"use client";

import Link from "next/link";
import { MapPin, NavArrowRight, User } from "iconoir-react";
import { DateTimeStack } from "@/components/date-time-stack";
import { useDemoNow } from "@/components/demo-now";
import controls from "@/components/ui/controls.module.css";
import {
  formatRemaining,
  formatStackDay,
  getDateStackLabels,
} from "@/lib/date-stack";
import { formatMoscowTime } from "@/lib/campus-time";
import { formatRoom, joinDetails } from "@/lib/room-format";
import { getDayTimeline } from "@/lib/day-timeline";
import { getTodayFocus, type TodayEvent } from "@/lib/today-view-utils";
import { DayTimeline } from "./day-timeline";
import styles from "./next-lesson-card.module.css";

function getProgress(event: TodayEvent, now: Date): number {
  const start = event.startsAt.getTime();
  const share = (now.getTime() - start) / (event.endsAt.getTime() - start);
  return Math.round(Math.min(1, Math.max(0, share)) * 100);
}

/** Прежнее время перенесённого занятия, если оно действительно другое. */
function getPreviousTime(event: TodayEvent, now: Date): string | null {
  if (
    event.status !== "RESCHEDULED" ||
    !event.originalStartsAt ||
    event.originalStartsAt.getTime() === event.startsAt.getTime()
  ) {
    return null;
  }
  const time = [event.originalStartsAt, event.originalEndsAt]
    .filter((date) => date !== null)
    .map(formatMoscowTime)
    .join("–");
  return `${formatStackDay(event.originalStartsAt, now)}, ${time}`;
}

export function NextLessonCard({
  events,
  serverNow,
}: {
  events: readonly TodayEvent[];
  serverNow: Date;
}) {
  const now = useDemoNow() ?? serverNow;
  const { state, main, next, isOverlapping } = getTodayFocus(
    events,
    now,
  );

  if (!main) {
    return (
      <section
        aria-labelledby="next-lesson-title"
        className={styles.card}
        data-state="none"
      >
        <div className={styles.body}>
          <div className={styles.heading}>
            <h2 className={styles.title} id="next-lesson-title">
              Ближайших занятий нет
            </h2>
            <p>Новые занятия появятся здесь, когда их внесут в расписание.</p>
          </div>
          <div className={styles.emptyAction}>
            <Link className={controls.primary} href="/schedule">
              Открыть расписание
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const previousTime = getPreviousTime(main, now);
  const chips = [
    state === "cancelled" ? { label: "Отменено", isStrong: true } : null,
    state === "current"
      ? {
          label: `Идёт сейчас · осталось ${formatRemaining(main.endsAt, now)}`,
          isStrong: true,
        }
      : null,
    main.status === "RESCHEDULED"
      ? { label: previousTime ? "Перенесено" : "Изменено", isStrong: false }
      : null,
  ].filter((chip) => chip !== null);
  const room = formatRoom(main.room);
  const time = [main.startsAt, main.endsAt].map(formatMoscowTime).join("–");
  const timeline = getDayTimeline(events, main, now);
  const isNextOnTimeline = Boolean(
    next && timeline?.items.some((item) => item.event.id === next.id),
  );
  const label =
    main.kind === "session" ? "Ближайшее событие сессии" : "Ближайшее занятие";

  return (
    <section
      aria-labelledby="next-lesson-title"
      className={styles.card}
      data-state={state}
    >
      <div className={styles.body}>
        <div className={styles.heading}>
          <div className={styles.topline}>
            <p className={styles.label}>
              {label} · {main.typeLabel}
            </p>
            {chips.map((chip) => (
              <span
                className={styles.chip}
                data-strong={chip.isStrong || undefined}
                key={chip.label}
              >
                {chip.label}
              </span>
            ))}
          </div>
          <h2
            className={styles.title}
            id="next-lesson-title"
            title={main.title}
          >
            {main.title}
          </h2>
          {room || main.teacher ? (
            <ul className={styles.details}>
              {room ? (
                <li>
                  <MapPin aria-hidden="true" />
                  {room}
                </li>
              ) : null}
              {main.teacher ? (
                <li>
                  <User aria-hidden="true" />
                  {main.teacher}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <div className={styles.when}>
          <p className={styles.day}>
            {joinDetails(
              formatStackDay(main.startsAt, now),
              state === "today" || state === "upcoming"
                ? getDateStackLabels(main.startsAt, { now }).relative
                : null,
            )}
          </p>
          <p className={styles.time}>
            {state === "cancelled" ? <s>{time}</s> : time}
          </p>
          {previousTime ? (
            <p className={styles.previous}>
              Было: <s>{previousTime}</s>
            </p>
          ) : null}
  <div className={styles.actions}>
            {main.onlineUrl && state !== "cancelled" ? (
              <>
                <a
                  className={styles.button}
                  href={main.onlineUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Подключиться
                  <span className={controls.visuallyHidden}>
                    {" "}
                    (откроется в новой вкладке)
                  </span>
                </a>
                <Link className={styles.link} href={main.scheduleHref}>
                  Открыть в расписании →
                </Link>
              </>
            ) : (
              <>
                <Link className={styles.button} href={main.scheduleHref}>
                  Открыть в расписании
                </Link>
                {main.detailsHref !== main.scheduleHref ? (
                  <Link className={styles.link} href={main.detailsHref}>
                    Подробнее →
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </div>
        {next ? (
          <Link
            className={styles.next}
            data-on-timeline={isNextOnTimeline || undefined}
            data-overlap={isOverlapping || undefined}
            href={next.detailsHref}
          >
            <span>
              {next.typeLabel}
              <span className={styles.nextName}> · {next.title}</span>
              <span className={styles.nextMoment}>
                {" · "}
                <DateTimeStack
                  end={next.endsAt}
                  value={next.startsAt}
                  variant="moment"
                />
              </span>
              {isOverlapping ? (
                <span className={styles.overlap}>
                  {" "}
                  пересекается по времени
                </span>
              ) : null}
            </span>
            <NavArrowRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {state === "current" ? (
        <div
          aria-label="Прошло времени занятия"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={getProgress(main, now)}
          className={styles.progress}
          data-on-timeline={timeline ? true : undefined}
          role="progressbar"
        >
          <span style={{ width: `${getProgress(main, now)}%` }} />
        </div>
      ) : null}
      {timeline ? (
        <DayTimeline
          label={`События дня: ${formatStackDay(main.startsAt, now)}`}
          mainId={main.id}
          now={now}
          timeline={timeline}
        />
      ) : null}
    </section>
  );
}

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
import { formatRoom } from "@/lib/room-format";
import { getTodayFocus, type TodayEvent } from "@/lib/today-view-utils";
import styles from "./next-lesson-card.module.css";

function getProgress(event: TodayEvent, now: Date): number {
  const start = event.startsAt.getTime();
  const share = (now.getTime() - start) / (event.endsAt.getTime() - start);
  return Math.round(Math.min(1, Math.max(0, share)) * 100);
}

function getChip(
  event: TodayEvent,
  state: string,
  now: Date,
): { label: string; tone?: "accent" | "danger" } | null {
  if (state === "cancelled") return { label: "Отменено", tone: "danger" };
  if (state === "current") {
    return {
      label: `Идёт сейчас · осталось ${formatRemaining(event.endsAt, now)}`,
      tone: "accent",
    };
  }
  const { relative } = getDateStackLabels(event.startsAt, { now });
  return relative ? { label: relative } : null;
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
  const { state, main, next, isNextUrgent, isOverlapping } = getTodayFocus(
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
            <p className={styles.type}>
              Новые занятия появятся здесь, когда их внесут в расписание.
            </p>
          </div>
          <div className={styles.actions}>
            <Link className={controls.primary} href="/schedule">
              Открыть расписание
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const chip = getChip(main, state, now);
  const previousTime = getPreviousTime(main, now);
  const isRescheduled = main.status === "RESCHEDULED";
  const room = formatRoom(main.room);
  const label =
    main.kind === "session" ? "Ближайшее событие сессии" : "Ближайшее занятие";

  return (
    <section
      aria-labelledby="next-lesson-title"
      className={styles.card}
      data-state={state}
    >
      <div className={styles.topline}>
        <p className={styles.label}>{label}</p>
        <div className={styles.chips}>
          {isRescheduled ? (
            <span className={styles.chip} data-tone="accent">
              {previousTime ? "Перенесено" : "Изменено"}
            </span>
          ) : null}
          {chip ? (
            <span className={styles.chip} data-tone={chip.tone}>
              {chip.label}
            </span>
          ) : null}
        </div>
      </div>
      {state === "current" ? (
        <div
          aria-label="Прошло времени занятия"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={getProgress(main, now)}
          className={styles.progress}
          role="progressbar"
        >
          <span style={{ width: `${getProgress(main, now)}%` }} />
        </div>
      ) : null}
      <div className={styles.heading}>
        <h2
          className={styles.title}
          id="next-lesson-title"
          title={main.title}
        >
          {main.title}
        </h2>
        <p className={styles.type}>{main.typeLabel}</p>
      </div>
      <div className={styles.body}>
        <div className={styles.when}>
            <p
              className={styles.moment}
              data-cancelled={state === "cancelled" || undefined}
            >
              {state === "cancelled" ? (
                <s>
                  <DateTimeStack
                    end={main.endsAt}
                    value={main.startsAt}
                    variant="moment"
                  />
                </s>
              ) : (
                <DateTimeStack
                  end={main.endsAt}
                  value={main.startsAt}
                  variant="moment"
                />
              )}
            </p>
            {previousTime ? (
              <p className={styles.type}>
                Было: <s>{previousTime}</s>
              </p>
            ) : null}
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
        <div className={styles.actions}>
          {main.onlineUrl && state !== "cancelled" ? (
            <>
              <a
                className={controls.primary}
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
              <Link className={controls.primary} href={main.scheduleHref}>
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
        <Link className={styles.next} href={next.detailsHref}>
          <span className={styles.nextText}>
            <span className={styles.nextName}>
              <span
                className={styles.chip}
                data-tone={isNextUrgent ? "accent" : undefined}
              >
                Далее · {next.typeLabel}
              </span>
              <span className={styles.nextTitle} title={next.title}>
                {next.title}
              </span>
            </span>
            <span className={styles.nextMeta}>
              <DateTimeStack
                end={next.endsAt}
                value={next.startsAt}
                variant="moment"
              />
              {isOverlapping ? (
                <span className={styles.overlap}>Пересекается по времени</span>
              ) : null}
            </span>
          </span>
          <NavArrowRight aria-hidden="true" className={styles.nextArrow} />
        </Link>
      ) : null}
    </section>
  );
}

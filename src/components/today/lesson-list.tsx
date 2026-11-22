"use client";

import Link from "next/link";
import { NavArrowRight } from "iconoir-react";
import { DateTimeStack } from "@/components/date-time-stack";
import { useDemoNow } from "@/components/demo-now";
import { EmptyState } from "@/components/empty-state";
import { formatRoom, joinDetails } from "@/lib/room-format";
import {
  getLessonsAfterFocus,
  getTodayFocus,
  type TodayEvent,
} from "@/lib/today-view-utils";
import { FitList } from "./fit-list";
import styles from "./today-lists.module.css";

const MAX_ROWS = 8;

/** «Ближайшие занятия»: всё, что идёт после главной карточки. */
export function LessonList({
  events,
  serverNow,
}: {
  events: readonly TodayEvent[];
  serverNow: Date;
}) {
  const now = useDemoNow() ?? serverNow;
  const lessons = getLessonsAfterFocus(
    events,
    getTodayFocus(events, now),
    now,
  ).slice(0, MAX_ROWS);

  if (lessons.length === 0) {
    return (
      <EmptyState
        action={
          <Link className={styles.link} href="/schedule?view=week">
            Показать неделю →
          </Link>
        }
        className={styles.empty}
        illustration="schedule"
        title="Других занятий пока нет"
      />
    );
  }

  return (
    <FitList>
      {lessons.map((lesson) => {
        const details = joinDetails(lesson.typeLabel, formatRoom(lesson.room));
        const isCancelled = lesson.status === "CANCELLED";
        return (
          <li className={styles.row} key={lesson.id}>
            <Link className={styles.rowLink} href={lesson.detailsHref}>
              <span className={styles.rowText}>
                <span
                  className={styles.title}
                  data-cancelled={isCancelled || undefined}
                  title={lesson.title}
                >
                  {lesson.title}
                </span>
                <span className={styles.meta}>
                  <DateTimeStack
                    end={lesson.endsAt}
                    value={lesson.startsAt}
                    variant={isCancelled ? "moment" : "inline"}
                  />
                  <span className={styles.details} title={details}>
                    {details}
                  </span>
                </span>
              </span>
              {lesson.status === "PLANNED" ? (
                <NavArrowRight aria-hidden="true" className={styles.arrow} />
              ) : (
                <span
                  className={styles.chip}
                  data-tone={isCancelled ? "danger" : "warning"}
                >
                  {isCancelled ? "Отменено" : "Перенесено"}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </FitList>
  );
}

"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { formatMoscowTime } from "@/lib/campus-time";
import type { ScheduleDayView, ScheduleLessonView } from "./schedule-view";
import styles from "./month-calendar.module.css";

const MAX_EVENTS = 4;

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const kindLegend = [
  ["LECTURE", "Лекция"],
  ["SEMINAR", "Семинар"],
  ["PRACTICE", "Практика"],
] as const;

const statusSuffix = {
  PLANNED: "",
  RESCHEDULED: ", перенесено",
  CANCELLED: ", отменено",
} as const;

// Если пар больше, последнюю строку занимает ссылка «Ещё N».
export function splitMonthEvents<T>(events: readonly T[]): {
  visible: T[];
  hiddenCount: number;
} {
  if (events.length <= MAX_EVENTS) {
    return { visible: [...events], hiddenCount: 0 };
  }
  return {
    visible: events.slice(0, MAX_EVENTS - 1),
    hiddenCount: events.length - MAX_EVENTS + 1,
  };
}

function formatPairs(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} пар`;
  if (last === 1) return `${count} пара`;
  if (last >= 2 && last <= 4) return `${count} пары`;
  return `${count} пар`;
}

export function MonthCalendar({
  dateKeys,
  days,
  selectedMonth,
  todayKey,
  openDayKey,
  now,
  formatDay,
  onKeyDown,
  onOpenDay,
  onOpenLesson,
}: {
  dateKeys: readonly string[];
  days: readonly ScheduleDayView[];
  /** ГГГГ-ММ */
  selectedMonth: string;
  todayKey: string;
  openDayKey: string | null;
  now: Date;
  formatDay: (dateKey: string) => string;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, dateKey: string) => void;
  onOpenDay: (dateKey: string) => void;
  onOpenLesson: (
    lesson: ScheduleLessonView,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
}) {
  const lessonsByDay = new Map(days.map((day) => [day.key, day.lessons]));

  return (
    <div className={styles.calendar}>
      <div
        aria-label="Календарь занятий на месяц"
        className={styles.grid}
        onKeyDown={(event) => {
          const cell =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-date]")
              : null;
          if (cell?.dataset.date) onKeyDown(event, cell.dataset.date);
        }}
        role="group"
      >
        {weekdays.map((weekday) => (
          <span aria-hidden="true" className={styles.weekday} key={weekday}>
            {weekday}
          </span>
        ))}
        {dateKeys.map((dateKey) => {
          const lessons = [...(lessonsByDay.get(dateKey) ?? [])].sort(
            (first, second) => first.startsAtMinutes - second.startsAtMinutes,
          );
          const { visible, hiddenCount } = splitMonthEvents(lessons);
          const day = Number(dateKey.slice(8, 10));
          return (
            <div
              className={styles.day}
              data-date={dateKey}
              data-open={dateKey === openDayKey || undefined}
              data-outside={dateKey.slice(0, 7) !== selectedMonth || undefined}
              data-today={dateKey === todayKey || undefined}
              key={dateKey}
              onClick={(event) => {
                // Пустое место ячейки открывает день, как в календарях.
                if (!(event.target as Element).closest("button")) {
                  onOpenDay(dateKey);
                }
              }}
            >
              <button
                aria-current={dateKey === todayKey ? "date" : undefined}
                aria-label={`${formatDay(dateKey)}, ${
                  lessons.length > 0 ? formatPairs(lessons.length) : "занятий нет"
                }`}
                aria-pressed={dateKey === openDayKey}
                className={styles.date}
                data-schedule-day={dateKey}
                id={`schedule-date-${dateKey}`}
                onClick={() => onOpenDay(dateKey)}
                type="button"
              >
                {day}
              </button>
              {visible.length > 0 ? (
                <ul className={styles.events}>
                  {visible.map((lesson) => {
                    const time = formatMoscowTime(new Date(lesson.startsAtIso));
                    const label = `${lesson.timeLabel}, ${lesson.subject}, ${lesson.kindLabel}, ауд. ${lesson.room}${statusSuffix[lesson.status]}`;
                    return (
                      <li key={lesson.id}>
                        <button
                          aria-label={label}
                          className={styles.event}
                          data-kind={lesson.kind}
                          data-lesson-id={lesson.id}
                          data-past={
                            Date.parse(lesson.endsAtIso) <= now.getTime() ||
                            undefined
                          }
                          data-status={lesson.status}
                          onClick={(event) => onOpenLesson(lesson, event)}
                          title={label}
                          type="button"
                        >
                          <time dateTime={lesson.startsAtIso}>{time}</time>
                          <span>{lesson.subject}</span>
                        </button>
                      </li>
                    );
                  })}
                  {hiddenCount > 0 ? (
                    <li>
                      <button
                        className={styles.more}
                        onClick={() => onOpenDay(dateKey)}
                        type="button"
                      >
                        Ещё {hiddenCount}
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
      <ul aria-label="Обозначения" className={styles.legend}>
        {kindLegend.map(([kind, label]) => (
          <li data-kind={kind} key={kind}>
            {label}
          </li>
        ))}
        <li data-status="RESCHEDULED">Перенесено</li>
        <li data-status="CANCELLED">Отменено</li>
      </ul>
    </div>
  );
}

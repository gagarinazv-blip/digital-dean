"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type {
  ScheduleKind,
  ScheduleStatus,
} from "@/generated/prisma/enums";
import { formatMoscowWeekdayDate, getMoscowTimeMinutes } from "@/lib/campus-time";
import {
  buildScheduleHref,
  calculateLessonLayout,
  filterScheduleDayLessons,
  getMonthCalendarDays,
  shiftScheduleDate,
  type ScheduleFilterState,
  type ScheduleLayoutEntry,
  type ScheduleViewMode,
} from "@/lib/schedule-view-utils";
import { generateScheduleIcs } from "@/lib/schedule-ics";
import styles from "./schedule.module.css";

export type ScheduleLessonView = {
  id: string;
  databaseId: string;
  dateKey: string;
  subject: string;
  kind: ScheduleKind;
  kindLabel: string;
  status: ScheduleStatus;
  startsAtIso: string;
  endsAtIso: string;
  startsAtMinutes: number;
  endsAtMinutes: number;
  timeLabel: string;
  originalDateLabel: string | null;
  originalTimeLabel: string | null;
  originalRoom: string | null;
  room: string;
  teacher: string;
  changeNote: string | null;
};

export type ScheduleDayView = {
  key: string;
  label: string;
  lessons: ScheduleLessonView[];
};

const statusPresentation: Record<
  ScheduleStatus,
  { icon: string; label: string; className: string }
> = {
  PLANNED: { icon: "✓", label: "По плану", className: styles.planned },
  RESCHEDULED: { icon: "↻", label: "Изменено", className: styles.rescheduled },
  CANCELLED: { icon: "×", label: "Отменено", className: styles.cancelled },
};

const kindFilterLabels: Record<ScheduleKind, string> = {
  LECTURE: "Лекция",
  SEMINAR: "Семинар",
  PRACTICE: "Практика",
};

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MINUTES_IN_HOUR = 60;

function isChanged(lesson: ScheduleLessonView): boolean {
  return lesson.status !== "PLANNED";
}

function getTimelineRange(days: readonly ScheduleDayView[]) {
  const lessonMinutes = days.flatMap((day) =>
    day.lessons
      .filter((lesson) => lesson.status !== "CANCELLED")
      .flatMap((lesson) => [lesson.startsAtMinutes, lesson.endsAtMinutes]),
  );
  const firstHour =
    lessonMinutes.length > 0
      ? Math.floor(Math.min(...lessonMinutes) / MINUTES_IN_HOUR) *
        MINUTES_IN_HOUR
      : 8 * MINUTES_IN_HOUR;
  const lastHour =
    lessonMinutes.length > 0
      ? Math.ceil(Math.max(...lessonMinutes) / MINUTES_IN_HOUR) *
        MINUTES_IN_HOUR
      : 18 * MINUTES_IN_HOUR;

  return {
    start: Math.min(7 * MINUTES_IN_HOUR, firstHour),
    end: Math.max(21 * MINUTES_IN_HOUR, lastHour),
  };
}

function formatClock(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  return `${String(Math.floor(safeMinutes / 60)).padStart(2, "0")}:${String(
    safeMinutes % 60,
  ).padStart(2, "0")}`;
}

function formatRelativeMinutes(minutes: number): string {
  const value = Math.max(0, minutes);
  if (value < 60) return `${value} мин`;
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  return remainder ? `${hours} ч ${remainder} мин` : `${hours} ч`;
}

function formatPairCount(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  const suffix =
    lastTwo >= 11 && lastTwo <= 14
      ? "пар"
      : last === 1
        ? "пара"
        : last >= 2 && last <= 4
          ? "пары"
          : "пар";
  return `${count} ${suffix}`;
}

function getDaySummary(lessons: readonly ScheduleLessonView[]) {
  const active = lessons
    .filter((lesson) => lesson.status !== "CANCELLED")
    .sort((a, b) => a.startsAtMinutes - b.startsAtMinutes);
  const longGaps = active.slice(1).flatMap((lesson, index) => {
    const previous = active[index];
    const duration = lesson.startsAtMinutes - previous.endsAtMinutes;
    return duration >= 60
      ? [
          {
            from: previous.endsAtMinutes,
            to: lesson.startsAtMinutes,
            duration,
          },
        ]
      : [];
  });
  return {
    count: active.length,
    first: active[0],
    last: active.at(-1),
    longGaps,
  };
}

function makeDayDateLabel(dateKey: string): string {
  return formatMoscowWeekdayDate(new Date(`${dateKey}T12:00:00.000Z`));
}

function makeDayPanelTitle(dateKey: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
    .format(new Date(`${dateKey}T12:00:00.000Z`))
    .toLocaleLowerCase("ru");
}

function findScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;
  while (current && current !== document.body) {
    if (/(auto|scroll)/.test(window.getComputedStyle(current).overflowY)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function getLessonHref(
  lesson: ScheduleLessonView,
  view: ScheduleViewMode,
  filters: ScheduleFilterState,
) {
  return buildScheduleHref(view, lesson.dateKey, filters, lesson.databaseId);
}

function useScheduleClock(nowIso: string, isDemoTime: boolean) {
  const [now, setNow] = useState(() => new Date(nowIso));

  useEffect(() => {
    if (isDemoTime) return;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [isDemoTime]);

  return new Date(
    isDemoTime ? Date.parse(nowIso) : Math.max(Date.parse(nowIso), now.getTime()),
  );
}

function TimelineLesson({
  lesson,
  layout,
  isCurrent,
  isNext,
  openLesson,
}: {
  lesson: ScheduleLessonView;
  layout: ScheduleLayoutEntry;
  isCurrent: boolean;
  isNext: boolean;
  openLesson: (
    lesson: ScheduleLessonView,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
}) {
  const status = statusPresentation[lesson.status];
  const kindClass = {
    LECTURE: styles.lecture,
    SEMINAR: styles.seminar,
    PRACTICE: styles.practice,
  }[lesson.kind];
  const inlineStyle = {
    top: `${layout.top}px`,
    height: `${layout.height}px`,
    left: `${layout.left}%`,
    width: `${layout.width}%`,
  } satisfies CSSProperties;

  return (
    <button
      aria-label={`${lesson.subject}, ${lesson.timeLabel}, ${lesson.kindLabel}, ауд. ${lesson.room}, ${lesson.teacher}, ${status.label}`}
      className={`${styles.timelineLesson} ${kindClass} ${
        lesson.status === "RESCHEDULED" ? styles.timelineChanged : ""
      } ${lesson.status === "CANCELLED" ? styles.timelineCancelled : ""} ${
        isCurrent ? styles.currentTimelineLesson : ""
      } ${isNext ? styles.nextTimelineLesson : ""}`}
      data-lesson-id={lesson.id}
      onClick={(event) => openLesson(lesson, event)}
      style={inlineStyle}
      type="button"
    >
      <time dateTime={lesson.startsAtIso}>{lesson.timeLabel}</time>
      <strong>{lesson.subject}</strong>
      <span>{lesson.kindLabel} · ауд. {lesson.room}</span>
      <span className={styles.timelineStatus}>
        {isCurrent ? "Сейчас" : isNext ? "Далее" : status.label}
      </span>
    </button>
  );
}

function TimelineColumn({
  day,
  timelineRange,
  nowMinutes,
  isToday,
  openLesson,
  showAxis,
}: {
  day: ScheduleDayView;
  timelineRange: { start: number; end: number };
  nowMinutes: number;
  isToday: boolean;
  openLesson: (
    lesson: ScheduleLessonView,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  showAxis?: boolean;
}) {
  const visibleLessons = useMemo(
    () => day.lessons.filter((lesson) => lesson.status !== "CANCELLED"),
    [day.lessons],
  );
  const layout = useMemo(
    () =>
      calculateLessonLayout(
        visibleLessons.map((lesson) => ({
          id: lesson.id,
          startMinutes: lesson.startsAtMinutes,
          endMinutes: lesson.endsAtMinutes,
        })),
        timelineRange.start,
        timelineRange.end,
      ),
    [visibleLessons, timelineRange.end, timelineRange.start],
  );
  const layoutById = new Map(layout.map((entry) => [entry.id, entry]));
  const currentLesson = isToday
    ? visibleLessons.find(
        (lesson) =>
          lesson.startsAtMinutes <= nowMinutes &&
          lesson.endsAtMinutes > nowMinutes,
      )
    : undefined;
  const nextLesson = isToday
    ? visibleLessons.find(
        (lesson) => lesson.startsAtMinutes > nowMinutes,
      )
    : undefined;
  const hours = Array.from(
    {
      length: Math.ceil((timelineRange.end - timelineRange.start) / 60) + 1,
    },
    (_, index) => timelineRange.start + index * 60,
  );

  return (
    <div className={styles.timelineColumn}>
      {showAxis && (
        <div className={styles.timelineAxis} aria-hidden="true">
          {hours.map((hour) => (
            <span
              key={hour}
              style={{ top: `${hour - timelineRange.start}px` }}
            >
              {formatClock(hour)}
            </span>
          ))}
        </div>
      )}
      <div
        aria-label={`Занятия: ${day.label}`}
        className={styles.timelineTrack}
        role="group"
        style={{ height: `${timelineRange.end - timelineRange.start}px` }}
      >
        {hours.map((hour) => (
          <span
            aria-hidden="true"
            className={styles.timelineHourLine}
            key={hour}
            style={{ top: `${hour - timelineRange.start}px` }}
          />
        ))}
        {isToday &&
          nowMinutes >= timelineRange.start &&
          nowMinutes <= timelineRange.end && (
            <span
              aria-hidden="true"
              className={styles.nowLine}
              style={{ top: `${nowMinutes - timelineRange.start}px` }}
            />
          )}
        {visibleLessons.map((lesson) => {
          const entry = layoutById.get(lesson.id);
          if (!entry) return null;
          return (
            <TimelineLesson
              key={lesson.id}
              lesson={lesson}
              layout={entry}
              isCurrent={currentLesson?.id === lesson.id}
              isNext={nextLesson?.id === lesson.id}
              openLesson={openLesson}
            />
          );
        })}
      </div>
      {day.lessons
        .filter((lesson) => lesson.status === "CANCELLED")
        .map((lesson) => (
          <button
            aria-label={`${lesson.subject}, отменено, ${lesson.timeLabel}`}
            className={styles.cancelledAgendaItem}
            data-lesson-id={lesson.id}
            key={lesson.id}
            onClick={(event) => openLesson(lesson, event)}
            type="button"
          >
            <s>{lesson.timeLabel}</s> · {lesson.subject} · отменено
          </button>
        ))}
    </div>
  );
}

function LessonAgenda({
  day,
  openLesson,
  emptyMessage = "Занятий нет",
}: {
  day: ScheduleDayView;
  openLesson: (
    lesson: ScheduleLessonView,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  emptyMessage?: string;
}) {
  if (day.lessons.length === 0) {
    return <p className={styles.emptyDay}>{emptyMessage}</p>;
  }

  return (
    <ul className={styles.lessonList}>
      {day.lessons.map((lesson) => {
        const status = statusPresentation[lesson.status];
        const changedTime = Boolean(
          lesson.originalTimeLabel &&
            lesson.originalTimeLabel !== lesson.timeLabel,
        );
        const changedDate = Boolean(lesson.originalDateLabel);
        const changedRoom = Boolean(
          lesson.originalRoom && lesson.originalRoom !== lesson.room,
        );

        return (
          <li key={lesson.id}>
            <button
              aria-label={`${lesson.subject}, ${lesson.timeLabel}, ${lesson.kindLabel}, ауд. ${lesson.room}, ${lesson.teacher}, ${status.label}`}
              className={`${styles.agendaLesson} ${
                lesson.status === "RESCHEDULED" ? styles.rescheduledCard : ""
              } ${lesson.status === "CANCELLED" ? styles.cancelledCard : ""}`}
              data-lesson-id={lesson.id}
              onClick={(event) => openLesson(lesson, event)}
              type="button"
            >
              <span className={styles.agendaTime}>
                {lesson.status === "CANCELLED" ? (
                  <s>{lesson.timeLabel}</s>
                ) : (
                  lesson.timeLabel
                )}
              </span>
              <span className={styles.agendaContent}>
                <span className={styles.agendaTitleRow}>
                  <strong>{lesson.subject}</strong>
                  <span className={`${styles.statusBadge} ${status.className}`}>
                    {status.label}
                  </span>
                </span>
                <span className={styles.kind}>
                  {lesson.kindLabel} · {lesson.teacher}
                </span>
                {lesson.status === "RESCHEDULED" &&
                  (changedDate || changedTime || changedRoom) && (
                    <span className={styles.agendaChange}>
                      Было:{" "}
                      {changedDate || changedTime
                        ? `${lesson.originalDateLabel ? `${lesson.originalDateLabel}, ` : ""}${lesson.originalTimeLabel ?? ""}`
                        : ""}
                      {changedRoom ? ` · ауд. ${lesson.originalRoom}` : ""}
                      {" → "}
                      {changedDate || changedTime
                        ? `${changedDate ? `${makeDayDateLabel(lesson.dateKey)}, ` : ""}${lesson.timeLabel}`
                        : ""}
                      {changedRoom ? ` · ауд. ${lesson.room}` : ""}
                    </span>
                  )}
                {lesson.changeNote && (
                  <span className={styles.agendaNote}>{lesson.changeNote}</span>
                )}
              </span>
              <span className={styles.roomBadge}>Ауд. {lesson.room}</span>
              <span aria-hidden="true" className={styles.detailChevron}>
                →
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function FocusDrawer({
  lesson,
  groupName,
  close,
}: {
  lesson: ScheduleLessonView;
  groupName: string;
  close: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.getElementById("schedule-lesson-dialog");
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => {
        const triggers = document.querySelectorAll<HTMLElement>(
          `[data-lesson-id="${CSS.escape(lesson.id)}"]`,
        );
        const trigger = [...triggers].find(
          (element) => element.getClientRects().length > 0,
        );
        (trigger ?? previouslyFocused)?.focus();
      });
    };
  }, [close, lesson.id]);

  return (
    <div className={styles.drawerLayer}>
      <button
        aria-label="Закрыть сведения о занятии"
        className={styles.drawerBackdrop}
        onClick={close}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-labelledby="schedule-lesson-title"
        aria-modal="true"
        className={styles.lessonDrawer}
        id="schedule-lesson-dialog"
        role="dialog"
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerEyebrow}>Занятие</span>
          <button
            aria-label="Закрыть сведения о занятии"
            className={styles.drawerClose}
            onClick={close}
            ref={closeRef}
            type="button"
          >
            ×
          </button>
        </div>
        <h2 id="schedule-lesson-title">{lesson.subject}</h2>
        <span
          className={`${styles.statusBadge} ${
            statusPresentation[lesson.status].className
          }`}
        >
          {statusPresentation[lesson.status].label}
        </span>
        <dl className={styles.drawerDetails}>
          <div>
            <dt>Дата и время</dt>
            <dd>
              {makeDayDateLabel(lesson.dateKey)} · {lesson.timeLabel}
            </dd>
          </div>
          <div>
            <dt>Формат занятия</dt>
            <dd>{lesson.kindLabel}</dd>
          </div>
          <div>
            <dt>Аудитория</dt>
            <dd>{lesson.room}</dd>
          </div>
          <div>
            <dt>Преподаватель</dt>
            <dd>{lesson.teacher}</dd>
          </div>
          <div>
            <dt>Группа</dt>
            <dd>{groupName}</dd>
          </div>
          {lesson.originalTimeLabel && (
            <div>
              <dt>
                {lesson.originalDateLabel
                  ? `Прежние дата и время · ${lesson.originalDateLabel}`
                  : "Прежнее время"}
              </dt>
              <dd>
                <s>{lesson.originalTimeLabel}</s>
              </dd>
            </div>
          )}
          {lesson.originalRoom && lesson.originalRoom !== lesson.room && (
            <div>
              <dt>Прежняя аудитория</dt>
              <dd>
                <s>{lesson.originalRoom}</s>
              </dd>
            </div>
          )}
          {lesson.changeNote && (
            <div>
              <dt>Примечание</dt>
              <dd>{lesson.changeNote}</dd>
            </div>
          )}
        </dl>
        <div className={styles.drawerActions}>
          <Link className={styles.drawerPrimaryLink} href="/grades">
            Открыть успеваемость
          </Link>
          <Link
            className={styles.drawerSecondaryLink}
            href={`${buildScheduleHref("today", lesson.dateKey)}#schedule-day-${lesson.dateKey}`}
          >
            Показать в календаре
          </Link>
        </div>
      </section>
    </div>
  );
}

function DayDrawer({
  day,
  hiddenCount,
  close,
  switchDay,
  nearestDayKey,
  openLesson,
  active,
}: {
  day: ScheduleDayView;
  hiddenCount: number;
  close: () => void;
  switchDay: (dateKey: string) => void;
  nearestDayKey: string | null;
  openLesson: (
    lesson: ScheduleLessonView,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  active: boolean;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeActionRef = useRef(close);
  const switchDayRef = useRef(switchDay);
  const currentDayRef = useRef(day.key);
  const hasFocusedInitiallyRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const summary = getDaySummary(day.lessons);
  const title = makeDayPanelTitle(day.key);
  const hasChanges = day.lessons.some(isChanged);

  useEffect(() => {
    closeActionRef.current = close;
    switchDayRef.current = switchDay;
    currentDayRef.current = day.key;
  }, [close, day.key, switchDay]);

  useEffect(() => {
    if (!active) return;
    const previousBodyOverflow = document.body.style.overflow;
    const scrollContainer = findScrollableAncestor(drawerRef.current);
    const previousContainerOverflow = scrollContainer?.style.overflowY ?? "";
    document.body.style.overflow = "hidden";
    if (scrollContainer) scrollContainer.style.overflowY = "hidden";

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeActionRef.current();
        return;
      }
      const directionByKey: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };
      const direction = directionByKey[event.key];
      if (direction !== undefined) {
        event.preventDefault();
        switchDayRef.current(
          shiftScheduleDate(currentDayRef.current, direction, "day"),
        );
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    let focusFrame: number | undefined;
    if (!hasFocusedInitiallyRef.current) {
      focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());
      hasFocusedInitiallyRef.current = true;
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (scrollContainer) {
        scrollContainer.style.overflowY = previousContainerOverflow;
      }
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame);
      window.requestAnimationFrame(() => {
        const triggers = document.querySelectorAll<HTMLElement>(
          `[data-schedule-day="${CSS.escape(currentDayRef.current)}"]`,
        );
        const trigger = [...triggers].find(
          (element) => element.getClientRects().length > 0,
        );
        trigger?.focus();
      });
    };
  }, [active]);

  return (
    <div className={styles.dayDrawerLayer}>
      <button
        aria-label="Закрыть сведения о дне"
        className={styles.dayDrawerBackdrop}
        onClick={close}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-hidden={!active}
        aria-labelledby="schedule-day-dialog-title"
        aria-modal={active ? "true" : undefined}
        className={styles.dayDrawer}
        id="schedule-day-dialog"
        ref={drawerRef}
        role="dialog"
      >
        <span
          aria-hidden="true"
          className={styles.dayDrawerHandle}
          onTouchStart={(event) => {
            touchStartYRef.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(event) => {
            const startY = touchStartYRef.current;
            const endY = event.changedTouches[0]?.clientY;
            touchStartYRef.current = null;
            if (startY !== null && endY !== undefined && endY - startY > 80) {
              closeActionRef.current();
            }
          }}
        />
        <header className={styles.dayDrawerHeader}>
          <div>
            <span className={styles.drawerEyebrow}>Расписание дня</span>
            <h2 id="schedule-day-dialog-title">{title}</h2>
          </div>
          <button
            aria-label="Закрыть панель дня"
            className={styles.drawerClose}
            onClick={close}
            ref={closeRef}
            type="button"
          >
            ×
          </button>
        </header>
        <div className={styles.dayDrawerSummary}>
          <p>
            {formatPairCount(summary.count)}
            {summary.first && summary.last
              ? ` · ${formatClock(summary.first.startsAtMinutes)}–${formatClock(summary.last.endsAtMinutes)}`
              : ""}
          </p>
          {hasChanges && (
            <span className={styles.dayChangeBadge}>Есть изменения</span>
          )}
        </div>
        {hiddenCount > 0 && (
          <p className={styles.dayDrawerHidden}>
            Скрыто фильтрами: {hiddenCount}
          </p>
        )}
        <div className={styles.dayDrawerBody}>
          <LessonAgenda
            day={day}
            emptyMessage={
              hiddenCount > 0
                ? "Нет совпадений с фильтрами"
                : "Занятий нет"
            }
            openLesson={openLesson}
          />
          {day.lessons.length === 0 && (
            <button
              className={styles.emptyLink}
              onClick={() =>
                switchDay(
                  nearestDayKey ??
                    shiftScheduleDate(day.key, 7, "day"),
                )
              }
              type="button"
            >
              Ближайший учебный день
            </button>
          )}
        </div>
        <nav aria-label="Навигация по дням" className={styles.dayDrawerNavigation}>
          <button
            className={styles.drawerSecondaryLink}
            onClick={() => switchDay(shiftScheduleDate(day.key, -1, "day"))}
            type="button"
          >
            ‹ Предыдущий день
          </button>
          <button
            className={styles.drawerSecondaryLink}
            onClick={() => switchDay(shiftScheduleDate(day.key, 1, "day"))}
            type="button"
          >
            Следующий день ›
          </button>
        </nav>
        <span aria-live="polite" className={styles.visuallyHidden}>
          Открыт день {title}, {formatPairCount(summary.count)}
        </span>
      </section>
    </div>
  );
}

export function ScheduleView({
  days,
  todayKey,
  view,
  nowIso,
  selectedDate,
  selectedLesson,
  nextLesson,
  groupName,
  filters,
  isDemoTime,
  openDayKey,
}: {
  days: ScheduleDayView[];
  todayKey: string;
  view: ScheduleViewMode;
  nowIso: string;
  selectedDate: string;
  selectedLesson: ScheduleLessonView | null;
  nextLesson: ScheduleLessonView | null;
  groupName: string;
  filters: ScheduleFilterState;
  isDemoTime: boolean;
  openDayKey: string | null;
}) {
  const router = useRouter();
  const [liveSearch, setLiveSearch] = useState(filters.q ?? "");
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const now = useScheduleClock(nowIso, isDemoTime);
  const nowMinutes = getMoscowTimeMinutes(now);
  const activeFilters = useMemo(
    () => ({ ...filters, q: liveSearch.trim() }),
    [filters, liveSearch],
  );
  const allLessons = useMemo(
    () => days.flatMap((day) => day.lessons),
    [days],
  );
  const filteredDays = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        lessons: filterScheduleDayLessons(
          day.key,
          day.lessons,
          activeFilters,
        ).lessons,
      })),
    [activeFilters, days],
  );
  const selectedDay = filteredDays.find((day) => day.key === selectedDate);
  const selectedLessons = selectedDay?.lessons ?? [];
  const rawOpenDay = openDayKey
    ? days.find((day) => day.key === openDayKey) ?? null
    : null;
  const openDayResults = openDayKey
    ? filterScheduleDayLessons(
        openDayKey,
        rawOpenDay?.lessons ?? [],
        activeFilters,
      )
    : null;
  const openDay = openDayKey
    ? {
        key: openDayKey,
        label: rawOpenDay?.label ?? makeDayDateLabel(openDayKey),
        lessons: openDayResults?.lessons ?? [],
      }
    : null;
  const unfilteredSelectedDay =
    days.find((day) => day.key === selectedDate) ?? null;
  const timelineRange = useMemo(
    () => getTimelineRange(days),
    [days],
  );
  const monthDays = useMemo(
    () => (view === "month" ? getMonthCalendarDays(selectedDate) : []),
    [selectedDate, view],
  );
  const dayCounts = useMemo(
    () => new Map(filteredDays.map((day) => [day.key, day.lessons.length])),
    [filteredDays],
  );
  const allChanges = days
    .flatMap((day) => day.lessons)
    .filter((lesson) => isChanged(lesson))
    .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
  const summary = getDaySummary(selectedLessons);
  const selectedIsToday = selectedDate === todayKey;
  const currentLesson = selectedIsToday
    ? selectedLessons.find(
        (lesson) =>
          lesson.status !== "CANCELLED" &&
          lesson.startsAtMinutes <= nowMinutes &&
          lesson.endsAtMinutes > nowMinutes,
      )
    : undefined;
  const upcomingLesson = selectedIsToday
    ? selectedLessons.find(
        (lesson) =>
          lesson.status !== "CANCELLED" &&
          lesson.startsAtMinutes > nowMinutes,
      )
    : undefined;
  const activeFilterCount = [
    activeFilters.kind,
    activeFilters.subject,
    activeFilters.q,
    activeFilters.changed,
  ].filter(Boolean).length;
  const monthLabel = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${selectedDate}T12:00:00.000Z`));
  const rangeLabel =
    view === "month"
      ? monthLabel
      : view === "week"
        ? `${days[0]?.label ?? ""} — ${days[6]?.label ?? ""}`
        : makeDayDateLabel(selectedDate);
  const dateUnit = view === "month" ? "month" : view === "week" ? "week" : "day";
  const previousDate = shiftScheduleDate(selectedDate, -1, dateUnit);
  const nextDate = shiftScheduleDate(selectedDate, 1, dateUnit);
  const subjects = [...new Set(allLessons.map((lesson) => lesson.subject))].sort(
    (a, b) => a.localeCompare(b, "ru"),
  );
  const daysWithLessons = filteredDays.filter((day) => {
    const belongsToSelectedMonth =
      view !== "month" || day.key.slice(0, 7) === selectedDate.slice(0, 7);
    return belongsToSelectedMonth && day.lessons.length > 0;
  });
  const nearestDayWithLessons = [...daysWithLessons].sort((first, second) => {
    const selectedTime = new Date(`${selectedDate}T00:00:00.000Z`).getTime();
    const firstDistance = Math.abs(
      new Date(`${first.key}T00:00:00.000Z`).getTime() - selectedTime,
    );
    const secondDistance = Math.abs(
      new Date(`${second.key}T00:00:00.000Z`).getTime() - selectedTime,
    );
    return firstDistance - secondDistance || first.key.localeCompare(second.key);
  })[0];
  const showSunday = (days[6]?.lessons.length ?? 0) > 0;
  const visibleWeekDays = filteredDays.slice(0, showSunday ? 7 : 6);

  function navigateTo(
    targetView: ScheduleViewMode,
    date: string,
    lessonId?: string,
    dayKey?: string,
  ) {
    router.push(
      buildScheduleHref(targetView, date, activeFilters, lessonId, dayKey),
      { scroll: false },
    );
  }

  function openDayPanel(dateKey: string) {
    if (dateKey === openDayKey) return;
    const href = buildScheduleHref(
      view,
      dateKey,
      activeFilters,
      undefined,
      dateKey,
    );
    if (openDayKey) {
      router.replace(href, { scroll: false });
    } else {
      router.push(href, { scroll: false });
    }
  }

  function openLesson(
    lesson: ScheduleLessonView,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const currentTarget = event.currentTarget;
    currentTarget.focus();
    navigateTo(
      view,
      lesson.dateKey,
      lesson.databaseId,
      openDayKey ? lesson.dateKey : undefined,
    );
  }

  const closeDrawer = useCallback(() => {
    router.replace(
      buildScheduleHref(
        view,
        selectedDate,
        activeFilters,
        undefined,
        openDayKey ?? undefined,
      ),
      { scroll: false },
    );
  }, [activeFilters, openDayKey, router, selectedDate, view]);

  const closeDayPanel = useCallback(() => {
    router.replace(buildScheduleHref(view, selectedDate, activeFilters), {
      scroll: false,
    });
  }, [activeFilters, router, selectedDate, view]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFilters: ScheduleFilterState = {
      kind: String(formData.get("kind") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      q: String(formData.get("q") ?? "").trim(),
      changed: formData.get("changed") === "1",
    };
    router.push(buildScheduleHref(view, selectedDate, nextFilters), {
      scroll: false,
    });
  }

  function downloadWeekCalendar() {
    let content: string;
    try {
      content = generateScheduleIcs(allLessons, now);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      setCalendarError("Не удалось собрать календарь: проверьте данные занятий.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/calendar;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campus-os-week-${days[0]?.key ?? selectedDate}.ics`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setCalendarError(null);
  }

  function focusAdjacentDate(
    event: KeyboardEvent<HTMLDivElement>,
    currentDate: string,
  ) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const amount =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -7
            : 7;
    const targetDate = shiftScheduleDate(currentDate, amount, "day");
    document.getElementById(`schedule-date-${targetDate}`)?.focus();
  }

  const activeFilterLabels = [
    activeFilters.kind
      ? `Тип: ${
          Object.entries(kindFilterLabels).find(
            ([kind]) => kind === activeFilters.kind,
          )?.[1] ?? activeFilters.kind
        }`
      : "",
    activeFilters.subject ? `Дисциплина: ${activeFilters.subject}` : "",
    activeFilters.q ? `Поиск: ${activeFilters.q}` : "",
    activeFilters.changed ? "Только изменения" : "",
  ].filter(Boolean);

  return (
    <div className={styles.schedulePage}>
      <section className={styles.weekHero}>
        <span aria-hidden="true" className={styles.weekIcon}>
          <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
        </span>
        <div className={styles.weekHeroText}>
          <strong>
            {view === "month"
              ? "План занятий на месяц"
              : view === "week"
                ? "Расписание на неделю"
                : selectedIsToday
                  ? "Расписание на сегодня"
                  : "Расписание на день"}
          </strong>
          <span>{rangeLabel}</span>
        </div>
        <span aria-hidden="true" className={styles.weekHeroArt} />
      </section>

      <nav aria-label="Период расписания" className={styles.viewSwitch}>
        {(
          [
            ["today", "День"],
            ["week", "Неделя"],
            ["month", "Месяц"],
          ] as const
        ).map(([targetView, label]) => (
          <Link
            aria-current={view === targetView ? "page" : undefined}
            className={styles.viewButton}
            href={buildScheduleHref(targetView, selectedDate, activeFilters)}
            key={targetView}
            scroll={false}
          >
            {label}
          </Link>
        ))}
      </nav>

      <nav aria-label="Навигация по датам" className={styles.dateControls}>
        <div className={styles.dateNavigationGroup}>
          <Link
            aria-label={
              view === "month"
                ? "Предыдущий месяц"
                : view === "week"
                  ? "Предыдущая неделя"
                  : "Предыдущий день"
            }
            className={styles.dateArrow}
            href={buildScheduleHref(view, previousDate, activeFilters)}
            scroll={false}
          >
            <span aria-hidden="true">‹</span>
          </Link>
          <Link
            className={styles.todayButton}
            href={buildScheduleHref("today", todayKey, activeFilters)}
            scroll={false}
          >
            Сегодня
          </Link>
          <Link
            aria-label={
              view === "month"
                ? "Следующий месяц"
                : view === "week"
                  ? "Следующая неделя"
                  : "Следующий день"
            }
            className={styles.dateArrow}
            href={buildScheduleHref(view, nextDate, activeFilters)}
            scroll={false}
          >
            <span aria-hidden="true">›</span>
          </Link>
        </div>
        <span aria-live="polite" className={styles.selectedRange}>
          {rangeLabel}
        </span>
        <label className={styles.datePicker}>
          <span className={styles.visuallyHidden}>Выбрать дату</span>
          <input
            aria-label="Выбрать дату"
            max="2100-12-31"
            min="2000-01-01"
            onChange={(event) => {
              if (event.currentTarget.value) {
                navigateTo(view, event.currentTarget.value);
              }
            }}
            type="date"
            value={selectedDate}
          />
        </label>
      </nav>

      {view === "week" && (
        <>
          <div className={styles.weekActions}>
            <button
              className={styles.secondaryAction}
              onClick={downloadWeekCalendar}
              type="button"
            >
              Добавить в календарь
            </button>
            <button
              className={styles.secondaryAction}
              onClick={() => window.print()}
              type="button"
            >
              Печать недели
            </button>
          </div>
          {calendarError && (
            <p className={styles.calendarError} role="alert">
              {calendarError}
            </p>
          )}
        </>
      )}

      <form
        className={styles.filterPanel}
        key={`${view}:${selectedDate}:${filters.kind}:${filters.subject}:${filters.q}:${filters.changed}`}
        onSubmit={applyFilters}
      >
        <input name="view" type="hidden" value={view} />
        <input name="date" type="hidden" value={selectedDate} />
        <label>
          <span>Тип занятия</span>
          <select defaultValue={filters.kind} name="kind">
            <option value="">Все типы</option>
            {Object.entries(kindFilterLabels).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Дисциплина</span>
          <select defaultValue={filters.subject} name="subject">
            <option value="">Все дисциплины</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.searchFilter}>
          <span>Преподаватель или дисциплина</span>
          <input
            autoComplete="off"
            name="q"
            onChange={(event) => setLiveSearch(event.currentTarget.value)}
            placeholder="Быстрый поиск"
            type="search"
            value={liveSearch}
          />
        </label>
        <label className={styles.changedFilter}>
          <input
            defaultChecked={filters.changed}
            name="changed"
            type="checkbox"
            value="1"
          />
          <span>Только изменения</span>
        </label>
        <button className={styles.applyFilters} type="submit">
          Применить
        </button>
        {activeFilterCount > 0 && (
          <Link
            className={styles.clearFilters}
            href={buildScheduleHref(view, selectedDate)}
            scroll={false}
          >
            Сбросить фильтры
          </Link>
        )}
      </form>

      {activeFilterLabels.length > 0 && (
        <div aria-label="Активные фильтры" className={styles.filterChips}>
          {activeFilterLabels.map((label) => (
            <span className={styles.filterChip} key={label}>
              {label}
            </span>
          ))}
          <Link
            className={styles.clearChip}
            href={buildScheduleHref(view, selectedDate)}
            scroll={false}
          >
            Очистить все
          </Link>
        </div>
      )}

      {view === "week" && allChanges.length > 0 && (
        <section
          aria-labelledby="schedule-changes-title"
          className={styles.changesPanel}
        >
          <div className={styles.changesHeader}>
            <div>
              <h2 id="schedule-changes-title">Изменения на этой неделе</h2>
              <p>{allChanges.length} занятий требуют внимания</p>
            </div>
            <span aria-hidden="true">↻</span>
          </div>
          <ul>
            {allChanges.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={getLessonHref(lesson, view, activeFilters)}
                  scroll={false}
                >
                  <strong>{lesson.subject}</strong>
                  <span>
                    {makeDayDateLabel(lesson.dateKey)} · {lesson.timeLabel} ·{" "}
                    {statusPresentation[lesson.status].label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "today" && (
        <>
          {selectedIsToday && (
            <section
              aria-label="Сейчас и дальше"
              className={styles.nowSummary}
              aria-live="polite"
            >
              <div className={styles.nowSummaryMain}>
                <span className={styles.nowSummaryLabel}>
                  {currentLesson ? "Сейчас идёт" : "Дальше"}
                </span>
                <strong>
                  {currentLesson?.subject ??
                    upcomingLesson?.subject ??
                    nextLesson?.subject ??
                    (summary.count > 0 ? "Занятия на сегодня завершены" : "Сегодня свободный день")}
                </strong>
                <span>
                  {currentLesson
                    ? `До конца ${formatRelativeMinutes(
                        Math.ceil((new Date(currentLesson.endsAtIso).getTime() - now.getTime()) / 60_000),
                      )}`
                    : upcomingLesson
                      ? `Начало через ${formatRelativeMinutes(
                          Math.ceil((new Date(upcomingLesson.startsAtIso).getTime() - now.getTime()) / 60_000),
                        )} · ${upcomingLesson.timeLabel}`
                      : nextLesson
                        ? `Следующее занятие ${makeDayDateLabel(nextLesson.dateKey)}, ${nextLesson.timeLabel} · через ${formatRelativeMinutes(
                            Math.ceil((new Date(nextLesson.startsAtIso).getTime() - now.getTime()) / 60_000),
                          )}`
                      : "Ближайшее занятие отображается в расписании недели"}
                </span>
              </div>
              <div className={styles.daySummaryStats}>
                <strong>{summary.count}</strong>
                <span>{formatPairCount(summary.count)} сегодня</span>
                {summary.first && summary.last && (
                  <span>
                    {formatClock(summary.first.startsAtMinutes)}–{formatClock(summary.last.endsAtMinutes)}
                  </span>
                )}
                {summary.longGaps.length > 0 && (
                  <span>
                    Окна:{" "}
                    {summary.longGaps
                      .map(
                        ({ from, to, duration }) =>
                          `${formatRelativeMinutes(duration)} (${formatClock(from)}–${formatClock(to)})`,
                      )
                      .join(", ")}
                  </span>
                )}
              </div>
            </section>
          )}
          {selectedLessons.length > 0 ? (
            <section
              aria-label={`Занятия: ${selectedDay?.label ?? ""}`}
              id={`schedule-day-${selectedDate}`}
            >
              <div className={styles.dayTitleRow}>
                <h2 className={styles.dayHeading}>
                  {selectedDay?.label ?? "Выбранный день"}
                </h2>
                {selectedIsToday && (
                  <span className={styles.todayMark}>Сегодня</span>
                )}
              </div>
              <div className={styles.dayTimelineDesktop}>
                <TimelineColumn
                  day={selectedDay!}
                  isToday={selectedIsToday}
                  nowMinutes={nowMinutes}
                  openLesson={openLesson}
                  showAxis
                  timelineRange={timelineRange}
                />
              </div>
              <div className={styles.mobileAgenda}>
                <LessonAgenda day={selectedDay!} openLesson={openLesson} />
              </div>
            </section>
          ) : (
            <div aria-live="polite" className={styles.emptyState}>
              <strong>
                {activeFilterCount > 0
                  ? "По выбранным условиям занятий нет"
                  : selectedIsToday
                    ? "Сегодня занятий нет"
                    : "На эту дату занятий нет"}
              </strong>
              {activeFilterCount > 0 ? (
                <p>Измените или сбросьте фильтры, чтобы увидеть расписание.</p>
              ) : nextLesson ? (
                <p>
                  Ближайшее занятие: {makeDayDateLabel(nextLesson.dateKey)},{" "}
                  {nextLesson.timeLabel}, {nextLesson.subject}, ауд.{" "}
                  {nextLesson.room}
                </p>
              ) : (
                <p>В ближайшей неделе занятий нет.</p>
              )}
              {activeFilterCount > 0 && (
                <div className={styles.emptyActions}>
                  <Link
                    className={`${styles.emptyLink} ${styles.emptyLinkSecondary}`}
                    href={buildScheduleHref(view, selectedDate)}
                    scroll={false}
                  >
                    Сбросить фильтры
                  </Link>
                  <Link
                    className={`${styles.emptyLink} ${styles.emptyLinkSecondary}`}
                    href={buildScheduleHref("week", selectedDate, activeFilters)}
                    scroll={false}
                  >
                    Посмотреть неделю
                  </Link>
                </div>
              )}
              {activeFilterCount === 0 && (
                <div className={styles.emptyActions}>
                  {nearestDayWithLessons ? (
                    <Link
                      className={styles.emptyLink}
                      href={buildScheduleHref(
                        "today",
                        nearestDayWithLessons.key,
                        activeFilters,
                      )}
                      scroll={false}
                    >
                      Ближайший учебный день
                    </Link>
                  ) : nextLesson ? (
                    <Link
                      className={styles.emptyLink}
                      href={buildScheduleHref(
                        "today",
                        nextLesson.dateKey,
                        activeFilters,
                        nextLesson.databaseId,
                      )}
                      scroll={false}
                    >
                      Открыть ближайшее занятие
                    </Link>
                  ) : null}
                  <Link
                    className={`${styles.emptyLink} ${styles.emptyLinkSecondary}`}
                    href={buildScheduleHref("week", selectedDate, activeFilters)}
                    scroll={false}
                  >
                    Посмотреть неделю
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {view === "week" && (
        <>
          <div className={styles.weekGridViewport}>
            <div
              aria-label="Расписание на неделю по времени"
              className={`${styles.weekGrid} ${
                showSunday ? styles.weekGridSeven : styles.weekGridSix
              }`}
            >
              <div className={styles.weekGridCorner} />
              {visibleWeekDays.map((day) => (
                <button
                  aria-current={day.key === todayKey ? "date" : undefined}
                  aria-pressed={day.key === openDayKey}
                  className={`${styles.weekGridDayHeader} ${
                    day.key === openDayKey ? styles.selectedWeekDay : ""
                  }`}
                  data-schedule-day={day.key}
                  key={day.key}
                  onClick={() => openDayPanel(day.key)}
                  type="button"
                >
                  <span>{weekdayLabels[(new Date(`${day.key}T00:00:00Z`).getUTCDay() + 6) % 7]}</span>
                  <strong>{day.key.slice(8, 10)}</strong>
                </button>
              ))}
              <div className={styles.weekGridAxis} aria-hidden="true">
                {Array.from(
                  {
                    length:
                      Math.ceil(
                        (timelineRange.end - timelineRange.start) / 60,
                      ) + 1,
                  },
                  (_, index) => timelineRange.start + index * 60,
                ).map((hour) => (
                  <span
                    key={hour}
                    style={{ top: `${hour - timelineRange.start}px` }}
                  >
                    {formatClock(hour)}
                  </span>
                ))}
              </div>
              {visibleWeekDays.map((day) => (
                <div
                  aria-current={day.key === todayKey ? "date" : undefined}
                  aria-label={`${day.label}, открыть день`}
                  className={`${styles.weekGridColumn} ${
                    day.key === openDayKey ? styles.selectedWeekColumn : ""
                  }`}
                  data-schedule-day={day.key}
                  key={day.key}
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest("button")
                    ) {
                      return;
                    }
                    openDayPanel(day.key);
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.target !== event.currentTarget ||
                      (event.key !== "Enter" && event.key !== " ")
                    ) {
                      return;
                    }
                    event.preventDefault();
                    openDayPanel(day.key);
                  }}
                  role="group"
                  tabIndex={0}
                >
                  <TimelineColumn
                    day={day}
                    isToday={day.key === todayKey}
                    nowMinutes={nowMinutes}
                    openLesson={openLesson}
                    timelineRange={timelineRange}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.weekAgenda}>
            <nav aria-label="Дни недели" className={styles.weekDays}>
              {visibleWeekDays.map((day) => (
                <button
                  aria-current={day.key === todayKey ? "date" : undefined}
                  aria-pressed={day.key === openDayKey}
                  className={`${styles.weekDay} ${
                    day.key === openDayKey ? styles.selectedWeekDay : ""
                  }`}
                  data-schedule-day={day.key}
                  key={day.key}
                  onClick={() => openDayPanel(day.key)}
                  type="button"
                >
                  <strong>{weekdayLabels[(new Date(`${day.key}T00:00:00Z`).getUTCDay() + 6) % 7]}</strong>
                  <span>{day.key.slice(8, 10)}</span>
                </button>
              ))}
            </nav>
            <div className={styles.dayList}>
              {filteredDays.map((day) => (
                <section
                  aria-current={day.key === todayKey ? "date" : undefined}
                  className={`${styles.dayGroup} ${
                    day.key === todayKey ? styles.todayGroup : ""
                  }`}
                  data-schedule-day={day.key}
                  id={`schedule-day-${day.key}`}
                  key={day.key}
                >
                  <div className={styles.dayTitleRow}>
                    <button
                      aria-pressed={day.key === openDayKey}
                      className={styles.weekAgendaDayTitle}
                      data-schedule-day={day.key}
                      onClick={() => openDayPanel(day.key)}
                      type="button"
                    >
                      {day.label}
                    </button>
                    {day.key === todayKey && (
                      <span className={styles.todayMark}>Сегодня</span>
                    )}
                  </div>
                  <LessonAgenda
                    day={day}
                    emptyMessage={
                      activeFilterCount > 0
                        ? "Нет совпадений с фильтрами"
                        : "Занятий нет"
                    }
                    openLesson={openLesson}
                  />
                </section>
              ))}
            </div>
          </div>
        </>
      )}

      {view === "month" && (
        <>
          <div
            aria-label="Календарь занятий на месяц"
            className={styles.monthGrid}
            onKeyDown={(event) => {
              const target = event.target;
              if (!(target instanceof HTMLButtonElement)) return;
              focusAdjacentDate(event, target.dataset.date ?? selectedDate);
            }}
            role="group"
          >
            {weekdayLabels.map((weekday) => (
              <span className={styles.monthWeekday} key={weekday}>
                {weekday}
              </span>
            ))}
            {monthDays.map((dateKey) => {
              const count = dayCounts.get(dateKey) ?? 0;
              const isCurrentMonth = dateKey.slice(0, 7) === selectedDate.slice(0, 7);
              return (
                <button
                  aria-current={dateKey === todayKey ? "date" : undefined}
                  aria-label={`${makeDayDateLabel(dateKey)}, занятий: ${count}`}
                  aria-pressed={dateKey === openDayKey}
                  className={`${styles.monthDay} ${
                    isCurrentMonth ? "" : styles.outsideMonth
                  } ${dateKey === todayKey ? styles.monthToday : ""} ${
                    dateKey === openDayKey ? styles.monthSelected : ""
                  }`}
                  data-date={dateKey}
                  data-schedule-day={dateKey}
                  id={`schedule-date-${dateKey}`}
                  key={dateKey}
                  onClick={() => openDayPanel(dateKey)}
                  type="button"
                >
                  <strong>{Number(dateKey.slice(8, 10))}</strong>
                  {count > 0 && (
                    <span className={styles.monthLessonCount}>
                      {count} {count === 1 ? "пара" : "пар"}
                    </span>
                  )}
                  {count === 0 && <span className={styles.monthNoLessons}>—</span>}
                </button>
              );
            })}
          </div>
          <div className={styles.monthUpcoming}>
            <h2>Занятия в выбранном месяце</h2>
            {daysWithLessons.length > 0 ? (
              daysWithLessons.map((day) => (
                <section className={styles.monthAgendaDay} key={day.key}>
                  <h3>{day.label}</h3>
                  <LessonAgenda day={day} openLesson={openLesson} />
                </section>
              ))
            ) : (
              <div className={styles.emptyState}>
                <strong>
                  {activeFilterCount > 0
                    ? "Нет занятий по выбранным фильтрам"
                    : "В этом месяце занятий нет"}
                </strong>
                <p>
                  {activeFilterCount > 0
                    ? "Измените условия поиска или сбросьте фильтры."
                    : "Выберите другой месяц или вернитесь к текущему расписанию."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {openDay && (
        <DayDrawer
          active={!selectedLesson}
          close={closeDayPanel}
          day={openDay}
          hiddenCount={openDayResults?.hiddenCount ?? 0}
          nearestDayKey={nearestDayWithLessons?.key ?? null}
          openLesson={openLesson}
          switchDay={openDayPanel}
        />
      )}
      {selectedLesson && (
        <FocusDrawer
          groupName={groupName}
          lesson={selectedLesson}
          close={closeDrawer}
        />
      )}
      <span className={styles.visuallyHidden} aria-live="polite">
        {unfilteredSelectedDay
          ? `Выбран день ${unfilteredSelectedDay.label}`
          : `Выбранная дата ${selectedDate}`}
      </span>
    </div>
  );
}

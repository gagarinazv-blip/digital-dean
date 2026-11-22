"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  formatMoscowWeekdayDate,
  getMoscowTimeMinutes,
  getUniversityDateTimeFormatter,
} from "@/lib/campus-time";
import {
  buildScheduleHref,
  buildScheduleSessionHref,
  calculateLessonLayout,
  filterScheduleDayLessons,
  getMonthCalendarDays,
  shiftScheduleDate,
  type ScheduleFilterState,
  type ScheduleLayoutEntry,
  type ScheduleViewMode,
} from "@/lib/schedule-view-utils";
import { generateScheduleIcs } from "@/lib/schedule-ics";
import {
  ScheduleFilterMenu,
  ScheduleSectionTabs,
  ScheduleToolbar,
} from "./schedule-toolbar";
import { DateTimeStack } from "@/components/date-time-stack";
import { useDemoNow } from "@/components/demo-now";
import { Drawer } from "@/components/ui/drawer";
import controls from "@/components/ui/controls.module.css";
import { MonthCalendar } from "./month-calendar";
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
  originalStartsAtIso?: string | null;
  originalEndsAtIso?: string | null;
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
  return getUniversityDateTimeFormatter({
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date(`${dateKey}T12:00:00.000Z`))
    .toLocaleLowerCase("ru");
}

function getLessonHref(
  lesson: ScheduleLessonView,
  view: ScheduleViewMode,
  filters: ScheduleFilterState,
) {
  return buildScheduleHref(view, lesson.dateKey, filters, lesson.databaseId);
}

function useScheduleClock(nowIso: string) {
  return useDemoNow() ?? new Date(nowIso);
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
      <strong title={lesson.subject}>{lesson.subject}</strong>
      <span title={`${lesson.kindLabel} · ауд. ${lesson.room}`}>
        {lesson.kindLabel} · ауд. {lesson.room}
      </span>
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

export function LessonAgenda({
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
                  <s>
                    <DateTimeStack
                      end={lesson.endsAtIso}
                      value={lesson.startsAtIso}
                    />
                  </s>
                ) : (
                  <DateTimeStack
                    end={lesson.endsAtIso}
                    value={lesson.startsAtIso}
                  />
                )}
              </span>
              <span className={`${styles.statusBadge} ${status.className}`}>
                {status.label}
              </span>
              <strong
                className={styles.agendaTitle}
                lang="ru"
                title={lesson.subject}
              >
                {lesson.subject}
              </strong>
              <span
                className={styles.agendaMeta}
                lang="ru"
                title={`${lesson.kindLabel} · ${lesson.teacher}`}
              >
                {lesson.kindLabel} · {lesson.teacher}
              </span>
              <span
                className={styles.roomBadge}
                lang="ru"
                title={`Ауд. ${lesson.room}`}
              >
                Ауд. {lesson.room}
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
              <span aria-hidden="true" className={styles.agendaAction}>
                →
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function focusVisible(selector: string) {
  requestAnimationFrame(() => {
    const isFocusLost =
      !document.activeElement || document.activeElement === document.body;
    if (!isFocusLost) return;
    [...document.querySelectorAll<HTMLElement>(selector)]
      .find((element) => element.getClientRects().length > 0)
      ?.focus();
  });
}

// Открытое окно задаёт адрес страницы. Закрываем его сразу, а адрес меняется
// следом, поэтому закрытое значение запоминаем до смены адреса.
function useDismissable(key: string | null, close: () => void) {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  if (dismissedKey !== null && dismissedKey !== key) setDismissedKey(null);
  return {
    open: key !== null && key !== dismissedKey,
    dismiss: () => {
      setDismissedKey(key);
      close();
    },
  };
}

function LessonDrawer({
  lesson,
  groupName,
  close,
}: {
  lesson: ScheduleLessonView | null;
  groupName: string;
  close: () => void;
}) {
  // Данные остаются до конца анимации закрытия.
  const [shown, setShown] = useState(lesson);
  if (lesson && lesson !== shown) setShown(lesson);
  const { open, dismiss } = useDismissable(lesson?.id ?? null, () => {
    close();
    if (lesson) focusVisible(`[data-lesson-id="${CSS.escape(lesson.id)}"]`);
  });
  if (!shown) return null;

  return (
    <Drawer
      eyebrow="Занятие"
      footer={
        <>
          <Link
            className={controls.secondary}
            href={`${buildScheduleHref("today", shown.dateKey)}#schedule-day-${shown.dateKey}`}
          >
            Показать в календаре
          </Link>
          <Link className={controls.primary} href="/grades">
            Открыть успеваемость
          </Link>
        </>
      }
      onClose={dismiss}
      open={open}
      title={shown.subject}
    >
      <span
        className={`${styles.statusBadge} ${
          statusPresentation[shown.status].className
        }`}
      >
        {statusPresentation[shown.status].label}
      </span>
      <dl className={styles.drawerDetails}>
        <div>
          <dt>Дата и время</dt>
          <dd>
            <DateTimeStack end={shown.endsAtIso} value={shown.startsAtIso} />
          </dd>
        </div>
        <div>
          <dt>Формат занятия</dt>
          <dd>{shown.kindLabel}</dd>
        </div>
        <div>
          <dt>Аудитория</dt>
          <dd>{shown.room}</dd>
        </div>
        <div>
          <dt>Преподаватель</dt>
          <dd>{shown.teacher}</dd>
        </div>
        <div>
          <dt>Группа</dt>
          <dd>{groupName}</dd>
        </div>
        {shown.originalStartsAtIso && (
          <div>
            <dt>Прежние дата и время</dt>
            <dd>
              <s>
                <DateTimeStack
                  end={shown.originalEndsAtIso}
                  value={shown.originalStartsAtIso}
                />
              </s>
            </dd>
          </div>
        )}
        {shown.originalRoom && shown.originalRoom !== shown.room && (
          <div>
            <dt>Прежняя аудитория</dt>
            <dd>
              <s>{shown.originalRoom}</s>
            </dd>
          </div>
        )}
        {shown.changeNote && (
          <div>
            <dt>Примечание</dt>
            <dd>{shown.changeNote}</dd>
          </div>
        )}
      </dl>
    </Drawer>
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
  day: ScheduleDayView | null;
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
  const [shown, setShown] = useState(day);
  if (day && day !== shown) setShown(day);
  const { open, dismiss } = useDismissable(day?.key ?? null, () => {
    close();
    if (day) focusVisible(`[data-schedule-day="${CSS.escape(day.key)}"]`);
  });
  const switchDayRef = useRef(switchDay);
  const openDayKey = open && active ? (day?.key ?? null) : null;

  useEffect(() => {
    switchDayRef.current = switchDay;
  }, [switchDay]);

  useEffect(() => {
    if (!openDayKey) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
        event.key
      ];
      if (direction === undefined) return;
      event.preventDefault();
      switchDayRef.current(shiftScheduleDate(openDayKey, direction, "day"));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openDayKey]);

  if (!shown) return null;
  const summary = getDaySummary(shown.lessons);
  const title = makeDayPanelTitle(shown.key);

  return (
    <Drawer
      eyebrow="Расписание дня"
      footer={
        <>
          <button
            className={controls.secondary}
            onClick={() => switchDay(shiftScheduleDate(shown.key, -1, "day"))}
            type="button"
          >
            ‹ Предыдущий день
          </button>
          <button
            className={controls.secondary}
            onClick={() => switchDay(shiftScheduleDate(shown.key, 1, "day"))}
            type="button"
          >
            Следующий день ›
          </button>
        </>
      }
      id="schedule-day-dialog"
      onClose={dismiss}
      open={open}
      title={title}
    >
      <div className={styles.dayDrawerSummary}>
        <p>
          {formatPairCount(summary.count)}
          {summary.first && summary.last
            ? ` · ${formatClock(summary.first.startsAtMinutes)}–${formatClock(summary.last.endsAtMinutes)}`
            : ""}
        </p>
        {shown.lessons.some(isChanged) && (
          <span className={styles.dayChangeBadge}>Есть изменения</span>
        )}
      </div>
      {hiddenCount > 0 && (
        <p className={styles.dayDrawerHidden}>
          Скрыто фильтрами: {hiddenCount}
        </p>
      )}
      <LessonAgenda
        day={shown}
        emptyMessage={
          hiddenCount > 0 ? "Нет совпадений с фильтрами" : "Занятий нет"
        }
        openLesson={openLesson}
      />
      {shown.lessons.length === 0 && (
        <button
          className={controls.secondary}
          onClick={() =>
            switchDay(nearestDayKey ?? shiftScheduleDate(shown.key, 7, "day"))
          }
          type="button"
        >
          Ближайший учебный день
        </button>
      )}
      <span aria-live="polite" className={controls.visuallyHidden}>
        Открыт день {title}, {formatPairCount(summary.count)}
      </span>
    </Drawer>
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
  openDayKey: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [liveSearch, setLiveSearch] = useState(filters.q ?? "");
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const filterPanelRef = useRef<HTMLDetailsElement>(null);
  const periodPickerRef = useRef<HTMLDetailsElement>(null);
  const actionsMenuRef = useRef<HTMLDetailsElement>(null);
  const now = useScheduleClock(nowIso);
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
  const highlightedLesson = currentLesson ?? upcomingLesson;
  const activeFilterCount = [
    activeFilters.kind,
    activeFilters.subject,
    activeFilters.q,
    activeFilters.changed,
  ].filter(Boolean).length;
  const monthLabel = getUniversityDateTimeFormatter({
    month: "long",
    year: "numeric",
  }).format(new Date(`${selectedDate}T12:00:00.000Z`));
  const rangeLabel =
    view === "month"
      ? monthLabel
      : view === "week" || view === "list"
        ? getUniversityDateTimeFormatter({
            day: "numeric",
            month: "long",
            year: "numeric",
          }).formatRange(
            new Date(`${days[0]?.key ?? selectedDate}T12:00:00.000Z`),
            new Date(`${days[6]?.key ?? selectedDate}T12:00:00.000Z`),
          )
        : makeDayDateLabel(selectedDate);
  const dateUnit =
    view === "month" ? "month" : view === "week" || view === "list" ? "week" : "day";
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

  const navigateTo = useCallback((
    targetView: ScheduleViewMode,
    date: string,
    lessonId?: string,
    dayKey?: string,
  ) => {
    router.push(
      buildScheduleHref(targetView, date, activeFilters, lessonId, dayKey),
      { scroll: false },
    );
  }, [activeFilters, router]);

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

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (event.key === "Escape") {
        if (target instanceof HTMLElement && target.closest("[role='dialog']")) {
          return;
        }
        const openMenu = [
          filterPanelRef.current,
          periodPickerRef.current,
          actionsMenuRef.current,
        ].find((menu) => menu?.open);
        if (openMenu) {
          openMenu.open = false;
          event.preventDefault();
        }
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }
      if (target instanceof HTMLElement && target.closest("[role='dialog']")) {
        return;
      }

      if (event.key.toLowerCase() === "f") {
        if (filterPanelRef.current) {
          filterPanelRef.current.open = !filterPanelRef.current.open;
          event.preventDefault();
        }
        return;
      }

      const targetView =
        event.key === "1"
          ? "today"
          : event.key === "2"
            ? "week"
            : event.key === "3"
              ? "month"
              : event.key === "4"
                ? "list"
                : null;
      if (targetView) {
        navigateTo(targetView, selectedDate);
        event.preventDefault();
        return;
      }
      if (event.key.toLowerCase() === "t") {
        navigateTo(view, todayKey);
        event.preventDefault();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const amount = event.key === "ArrowLeft" ? -1 : 1;
        navigateTo(view, shiftScheduleDate(selectedDate, amount, dateUnit));
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeFilters, dateUnit, navigateTo, selectedDate, todayKey, view]);

  function downloadCalendar() {
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
    anchor.download = `campus-os-${view}-${days[0]?.key ?? selectedDate}.ics`;
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
  const lessonsHref = buildScheduleHref(view, selectedDate, activeFilters);
  const sessionHref = buildScheduleSessionHref(lessonsHref);

  useEffect(() => {
    if (searchParams.has("view")) return;
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    router.replace(buildScheduleHref("list", selectedDate, activeFilters), {
      scroll: false,
    });
  }, [activeFilters, router, searchParams, selectedDate]);

  return (
    <div className={styles.schedulePage}>
      <ScheduleToolbar>
        <ScheduleSectionTabs
          active="lessons"
          lessonsHref={lessonsHref}
          sessionHref={sessionHref}
        />
        <div className={styles.scheduleToolbarRow}>
          <nav aria-label="Навигация по датам" className={styles.dateControls}>
            <div className={styles.dateNavigationGroup}>
              <Link
                aria-label={view === "month" ? "Предыдущий месяц" : view === "week" || view === "list" ? "Предыдущая неделя" : "Предыдущий день"}
                className={styles.dateArrow}
                href={buildScheduleHref(view, previousDate, activeFilters)}
                scroll={false}
              >
                <span aria-hidden="true">‹</span>
              </Link>
              <Link
                className={styles.todayButton}
                href={buildScheduleHref(view, todayKey, activeFilters)}
                scroll={false}
              >
                Сегодня
              </Link>
              <Link
                aria-label={view === "month" ? "Следующий месяц" : view === "week" || view === "list" ? "Следующая неделя" : "Следующий день"}
                className={styles.dateArrow}
                href={buildScheduleHref(view, nextDate, activeFilters)}
                scroll={false}
              >
                <span aria-hidden="true">›</span>
              </Link>
            </div>
            <details className={styles.periodPicker} ref={periodPickerRef}>
              <summary aria-label={`Выбрать период: ${rangeLabel}`} className={styles.selectedRange}>
                <span aria-live="polite">{rangeLabel}</span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className={styles.datePopover}>
                <label>
                  <span>Перейти к дате</span>
                  <input
                    aria-label="Выбрать дату"
                    max="2100-12-31"
                    min="2000-01-01"
                    onChange={(event) => {
                      if (event.currentTarget.value) {
                        navigateTo(view, event.currentTarget.value);
                        if (periodPickerRef.current) periodPickerRef.current.open = false;
                      }
                    }}
                    type="date"
                    value={selectedDate}
                  />
                </label>
              </div>
            </details>
          </nav>

          <div className={styles.toolbarActions}>
            <nav aria-label="Вид расписания" className={styles.viewSwitch}>
              {(
                [
                  ["today", "День"],
                  ["week", "Неделя"],
                  ["month", "Месяц"],
                  ["list", "Список"],
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
            <ScheduleFilterMenu
              activeCount={activeFilterCount}
              detailsRef={filterPanelRef}
              panelClassName={styles.scheduleFilterPopup}
            >
              <form
                className={styles.filterPanel}
                key={`${view}:${selectedDate}:${filters.kind}:${filters.subject}:${filters.q}:${filters.changed}`}
                onSubmit={(event) => {
                  applyFilters(event);
                  if (filterPanelRef.current) filterPanelRef.current.open = false;
                }}
              >
                <label>
                  <span>Тип занятия</span>
                  <select defaultValue={filters.kind} name="kind">
                    <option value="">Все типы</option>
                    {Object.entries(kindFilterLabels).map(([kind, label]) => (
                      <option key={kind} value={kind}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Дисциплина</span>
                  <select defaultValue={filters.subject} name="subject">
                    <option value="">Все дисциплины</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
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
                  <input defaultChecked={filters.changed} name="changed" type="checkbox" value="1" />
                  <span>Только изменения</span>
                </label>
                <button className={styles.applyFilters} type="submit">Применить</button>
                {activeFilterCount > 0 && (
                  <Link className={styles.clearFilters} href={buildScheduleHref(view, selectedDate)} scroll={false}>
                    Сбросить фильтры
                  </Link>
                )}
              </form>
            </ScheduleFilterMenu>
            <details className={styles.actionsMenu} ref={actionsMenuRef}>
              <summary aria-label="Другие действия" className={styles.menuTrigger}>⋯</summary>
              <div className={styles.actionsPopup}>
                <button onClick={downloadCalendar} type="button">Скачать расписание (.ics)</button>
                <button onClick={() => window.print()} type="button">Печать расписания</button>
              </div>
            </details>
          </div>
        </div>
        {activeFilterLabels.length > 0 && (
          <div aria-label="Активные фильтры" className={styles.filterChips}>
            {activeFilterLabels.map((label) => (
              <span className={styles.filterChip} key={label}>{label}</span>
            ))}
            <Link className={styles.clearChip} href={buildScheduleHref(view, selectedDate)} scroll={false}>
              Сбросить
            </Link>
          </div>
        )}
      </ScheduleToolbar>
      {calendarError && <p className={styles.calendarError} role="alert">{calendarError}</p>}

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
                  <span>{statusPresentation[lesson.status].label}</span>
                  <DateTimeStack
                    end={lesson.endsAtIso}
                    value={lesson.startsAtIso}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "today" && (
        <>
          {selectedIsToday && summary.count > 0 && (
            <section
              aria-label="Сейчас и дальше"
              className={styles.nowSummary}
              aria-live="polite"
            >
              <p className={styles.nowSummaryText}>
                <strong>{currentLesson ? "Сейчас:" : upcomingLesson ? "Дальше:" : "Сегодня:"}</strong>{" "}
                {currentLesson?.subject ??
                  upcomingLesson?.subject ??
                  "Занятия завершились"}
                {currentLesson
                  ? ` до ${formatClock(currentLesson.endsAtMinutes)}`
                  : upcomingLesson
                    ? ` в ${formatClock(upcomingLesson.startsAtMinutes)}`
                    : ""}
                {(currentLesson ?? upcomingLesson)?.room
                  ? ` · ауд. ${(currentLesson ?? upcomingLesson)?.room}`
                  : ""}
              </p>
              {highlightedLesson && (
                <Link
                  className={styles.nowSummaryLink}
                  href={getLessonHref(
                    highlightedLesson,
                    view,
                    activeFilters,
                  )}
                  scroll={false}
                >
                  Показать
                </Link>
              )}
            </section>
          )}
          {selectedLessons.length > 0 ? (
            <section
              aria-label={`Занятия: ${selectedDay?.label ?? ""}`}
              id={`schedule-day-${selectedDate}`}
            >
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
            <EmptyState
              action={
                activeFilterCount > 0 ? (
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
                ) : (
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
                      <>
                      <div className={styles.emptyDate}>
                        <DateTimeStack
                          end={nextLesson.endsAtIso}
                          value={nextLesson.startsAtIso}
                        />
                      </div>
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
                      </>
                    ) : null}
                    <Link
                      className={`${styles.emptyLink} ${styles.emptyLinkSecondary}`}
                      href={buildScheduleHref("week", selectedDate, activeFilters)}
                      scroll={false}
                    >
                      Посмотреть неделю
                    </Link>
                  </div>
                )
              }
              ariaLive="polite"
              className={styles.emptyState}
              description={
                activeFilterCount > 0
                  ? "Измените или сбросьте фильтры, чтобы увидеть расписание."
                  : nextLesson
                    ? `Ближайшее занятие: ${nextLesson.subject}, ауд. ${nextLesson.room}`
                    : "В ближайшей неделе занятий нет."
              }
              illustration={activeFilterCount > 0 ? "search" : "schedule"}
              title={
                activeFilterCount > 0
                  ? "По выбранным условиям занятий нет"
                  : selectedIsToday
                    ? "Сегодня занятий нет"
                    : "На эту дату занятий нет"
              }
            />
          )}
        </>
      )}

      {view === "list" && (
        <div aria-label="Список занятий по дням" className={styles.agendaFeed}>
          {daysWithLessons.length > 0 ? (
            daysWithLessons.map((day) => (
              <section className={styles.agendaFeedDay} key={day.key}>
                <div className={styles.agendaFeedHeading}>
                  <button
                    aria-pressed={day.key === openDayKey}
                    className={styles.weekAgendaDayTitle}
                    data-schedule-day={day.key}
                    onClick={() => openDayPanel(day.key)}
                    type="button"
                  >
                    {day.label}
                  </button>
                </div>
                <LessonAgenda day={day} openLesson={openLesson} />
              </section>
            ))
          ) : (
            <EmptyState
              className={styles.emptyState}
              description={
                activeFilterCount
                  ? "Измените условия или сбросьте фильтры."
                  : "В этом периоде занятий не запланировано."
              }
              illustration={activeFilterCount ? "search" : "schedule"}
              title={activeFilterCount ? "Нет занятий по выбранным фильтрам" : "Занятий нет"}
            />
          )}
        </div>
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
          <MonthCalendar
            dateKeys={monthDays}
            days={filteredDays}
            formatDay={makeDayDateLabel}
            now={now}
            onKeyDown={focusAdjacentDate}
            onOpenDay={openDayPanel}
            onOpenLesson={openLesson}
            openDayKey={openDayKey}
            selectedMonth={selectedDate.slice(0, 7)}
            todayKey={todayKey}
          />
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
              <EmptyState
                className={styles.emptyState}
                description={
                  activeFilterCount > 0
                    ? "Измените условия поиска или сбросьте фильтры."
                    : "Выберите другой месяц или вернитесь к текущему расписанию."
                }
                illustration={activeFilterCount > 0 ? "search" : "schedule"}
                title={
                  activeFilterCount > 0
                    ? "Нет занятий по выбранным фильтрам"
                    : "В этом месяце занятий нет"
                }
              />
            )}
          </div>
        </>
      )}

      <DayDrawer
        active={!selectedLesson}
        close={closeDayPanel}
        day={openDay}
        hiddenCount={openDayResults?.hiddenCount ?? 0}
        nearestDayKey={nearestDayWithLessons?.key ?? null}
        openLesson={openLesson}
        switchDay={openDayPanel}
      />
      <LessonDrawer
        close={closeDrawer}
        groupName={groupName}
        lesson={selectedLesson}
      />
      <span className={styles.visuallyHidden} aria-live="polite">
        {unfilteredSelectedDay
          ? `Выбран день ${unfilteredSelectedDay.label}`
          : `Выбранная дата ${selectedDate}`}
      </span>
    </div>
  );
}

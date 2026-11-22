"use client";

import { DateTimeStack } from "@/components/date-time-stack";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { EmptyState } from "@/components/empty-state";
import {
  buildSessionHref,
  filterSessionEvents,
  findSessionInsights,
  generateSessionIcs,
  getSessionEventStatusLabel,
  getSessionStatus,
  groupSessionEventsByDate,
  parseSessionFilters,
  summarizeSession,
  type SessionEventForUtils,
  type SessionFilters,
  type SessionStatusFilter,
} from "@/lib/session-utils";
import {
  getUniversityDateTimeFormatter,
  parseMoscowDateTime,
} from "@/lib/campus-time";
import { getMonthCalendarDays, shiftScheduleDate } from "@/lib/schedule-view-utils";
import {
  ScheduleFilterMenu,
  ScheduleSectionTabs,
  ScheduleToolbar,
} from "./schedule-toolbar";
import styles from "./session.module.css";

export type SessionAttemptView = {
  number: number;
  date: string;
  value: string;
};

export type SessionEventView = SessionEventForUtils & {
  id: string;
  subjectId: string;
  controlLabel: string;
  department: string;
  room: string;
  status: "PLANNED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
  resultStatus: "PASSED" | "ACADEMIC_DEBT" | null;
  resultValue: string | null;
  resultDate: string | null;
  attempts: SessionAttemptView[];
  formulaAvailable: boolean;
};

export type SessionSemesterView = {
  id: string;
  code: string;
  number: number;
  name: string;
  isCurrent: boolean;
  subjects: Array<{
    id: string;
    name: string;
    controlLabel: string;
    controlType: string;
    teacher: string;
    department: string;
    resultStatus: "PASSED" | "ACADEMIC_DEBT" | null;
    resultValue: string | null;
    resultDate: string | null;
    attemptCount: number;
    attempts: SessionAttemptView[];
    formulaAvailable: boolean;
    events: SessionEventView[];
  }>;
  events: SessionEventView[];
};

type Props = {
  semesters: SessionSemesterView[];
  academicYear: string;
  todayKey: string;
  nowTime: string;
};

const statusLabels: Record<SessionStatusFilter, string> = {
  all: "Все",
  upcoming: "Предстоят",
  passed: "Сданы",
  debts: "Долги",
};

function dateLabel(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return getUniversityDateTimeFormatter(options).format(
    new Date(`${dateKey}T12:00:00.000Z`),
  );
}

function controlTypeLabel(type: string): string {
  return type === "EXAM"
    ? "Экзамен"
    : type === "CREDIT"
      ? "Зачёт"
      : type === "DIFFERENTIATED_CREDIT"
        ? "Дифференцированный зачёт"
        : "Курсовая работа";
}

function eventStatus(
  event: SessionEventView,
  todayKey: string,
  nowTime: string,
) {
  const label = getSessionEventStatusLabel(event, todayKey, nowTime);
  const className =
    label === "Сдано"
      ? styles.passed
      : label === "Задолженность"
        ? styles.debt
        : label === "Перенесено" || label === "Пересдача назначена"
          ? styles.rescheduled
          : label === "Запланировано"
            ? styles.planned
            : styles.cancelled;
  return { label, className };
}

function SessionDate({ event }: { event: SessionEventView }) {
  return (
    <DateTimeStack
      end={parseMoscowDateTime(event.date, event.endTime)}
      value={parseMoscowDateTime(event.date, event.startTime)}
    />
  );
}

function EventCard({
  event,
  selected,
  onSelect,
  formulaHref,
  todayKey,
  nowTime,
}: {
  event: SessionEventView;
  selected: boolean;
  onSelect: () => void;
  formulaHref?: string;
  todayKey: string;
  nowTime: string;
}) {
  const status = eventStatus(event, todayKey, nowTime);
  return (
    <article
      className={`${styles.eventCard} ${selected ? styles.eventCardSelected : ""}`}
      id={`session-event-${event.id}`}
    >
      <button
        aria-expanded={selected}
        className={styles.eventSelect}
        onClick={onSelect}
        type="button"
      >
        <span className={styles.eventTime}>
          <SessionDate event={event} />
        </span>
        <span className={styles.eventMain}>
          <strong title={event.subject}>{event.subject}</strong>
          <span title={`${event.controlLabel} · ${event.teacher}`}>
            {event.controlLabel} · {event.teacher}
          </span>
          <span
            className={styles.eventLocation}
            title={`${event.room}${event.department ? ` · ${event.department}` : ""}`}
          >
            {event.room}
            {event.department ? ` · ${event.department}` : ""}
          </span>
        </span>
        <span className={`${styles.statusBadge} ${status.className}`}>
          {status.label}
        </span>
      </button>
      {event.status === "RESCHEDULED" && (
        <p className={styles.changeNote}>Событие перенесено.</p>
      )}
      {formulaHref && (
        <Link className={styles.eventGradeLink} href={formulaHref}>
          Рассчитать, сколько нужно набрать
        </Link>
      )}
    </article>
  );
}

function EventDetails({
  event,
  onClose,
  onDownload,
  gradeHref,
}: {
  event: SessionEventView;
  onClose: () => void;
  onDownload: () => void;
  gradeHref: string | null;
}) {
  return (
    <aside aria-labelledby="selected-session-title" className={styles.eventDetail}>
      <button
        aria-label="Закрыть подробности"
        className={styles.closeDetail}
        onClick={onClose}
        type="button"
      >
        ×
      </button>
      <span className={styles.eyebrow}>СОБЫТИЕ СЕССИИ</span>
      <h4 id="selected-session-title">{event.subject}</h4>
      <p>{event.controlLabel} · {event.teacher}</p>
      <SessionDate event={event} />
      <p>{event.room}</p>
      <button className={styles.secondaryButton} onClick={onDownload} type="button">
        В календарь
      </button>
      {gradeHref ? (
        <Link className={styles.gradeLink} href={gradeHref}>
          Рассчитать, сколько нужно набрать
        </Link>
      ) : (
        <p className={styles.formulaUnavailable}>Формула оценивания не опубликована.</p>
      )}
    </aside>
  );
}

export function SessionView({
  semesters,
  academicYear,
  todayKey,
  nowTime,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const filtersRef = useRef<HTMLDetailsElement>(null);
  const lessonParams = new URLSearchParams(
    [...params].filter(
      ([key]) =>
        ![
          "section",
          "semester",
          "projection",
          "status",
          "control",
          "q",
          "day",
          "event",
        ].includes(key),
    ),
  );
  lessonParams.set("section", "lessons");
  const lessonsHref = `/schedule?${lessonParams.toString()}`;
  const sessionHref = buildSessionHref(searchParams.toString());
  const initialSemester =
    params.get("semester") || semesters.find((semester) => semester.isCurrent)?.code || semesters[0]?.code || "";
  const selectedSemester =
    semesters.find((semester) => semester.code === initialSemester) ?? semesters[0];
  const [calendarError, setCalendarError] = useState<string | null>(null);

  function navigate(
    updates: Record<string, string | null>,
    replace = false,
  ) {
    const href = buildSessionHref(searchParams.toString(), updates);
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  const search = searchParams.toString();
  const activeFilters: SessionFilters = useMemo(
    () => parseSessionFilters(search),
    [search],
  );
  const projection = params.get("projection") === "calendar" ? "calendar" : "feed";
  const selectedEventId = params.get("event") ?? "";
  const allEvents = useMemo(
    () => selectedSemester?.events ?? [],
    [selectedSemester],
  );
  const selectedEvent = allEvents.find((event) => event.id === selectedEventId);
  const monthAnchor = getSafeDateKey(
    params.get("date"),
    selectedEvent?.date ?? todayKey,
  );
  const selectedDay = getSafeDateKey(
    params.get("day"),
    selectedEvent?.date ?? todayKey,
  );
  const visibleEvents = useMemo(
    () => filterSessionEvents(allEvents, activeFilters, todayKey),
    [allEvents, activeFilters, todayKey],
  );
  const eventGroups = useMemo(
    () => groupSessionEventsByDate(visibleEvents),
    [visibleEvents],
  );
  const summaryRows: SessionEventView[] =
    selectedSemester?.subjects.map((subject) => {
      const event = subject.events[0];
      return {
        id: event?.id ?? subject.id,
        subjectId: subject.id,
        subject: subject.name,
        controlType: subject.controlType,
        controlLabel: subject.controlLabel,
        teacher: subject.teacher,
        department: subject.department,
        date: event?.date ?? todayKey,
        startTime: event?.startTime ?? "00:00",
        endTime: event?.endTime ?? "00:00",
        room: event?.room ?? "",
        status: event?.status ?? "PLANNED",
        resultStatus: subject.resultStatus,
        resultValue: subject.resultValue,
        resultDate: subject.resultDate,
        attempts: subject.attempts,
        formulaAvailable: subject.formulaAvailable,
      };
    }) ?? [];
  const summary = summarizeSession(
    summaryRows,
    selectedSemester?.subjects.length ?? 0,
  );
  const sessionStatus = getSessionStatus(
    allEvents,
    todayKey,
    nowTime,
    summaryRows,
  );
  const sessionStatusClass = {
    NOT_STARTED: styles.sessionNotStarted,
    IN_PROGRESS: styles.sessionInProgress,
    COMPLETED: styles.sessionCompleted,
  }[sessionStatus.code];
  const insights = findSessionInsights(visibleEvents);
  const nearestEvent = allEvents
    .filter(
      (event) =>
        (event.status === "PLANNED" || event.status === "RESCHEDULED") &&
        (event.date > todayKey ||
          (event.date === todayKey && event.startTime > nowTime)) &&
        (event.resultStatus === null ||
          (event.resultStatus === "ACADEMIC_DEBT" &&
            event.resultDate !== null &&
            event.date > event.resultDate)),
    )
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        first.startTime.localeCompare(second.startTime),
    )[0];
  const calendarDays = getMonthCalendarDays(monthAnchor);
  const calendarEvents = new Map<string, SessionEventView[]>();
  for (const event of visibleEvents) {
    const dayEvents = calendarEvents.get(event.date) ?? [];
    dayEvents.push(event);
    calendarEvents.set(event.date, dayEvents);
  }
  const selectedDayEvents = calendarEvents.get(selectedDay) ?? [];
  const controlTypes = [...new Set(allEvents.map((event) => event.controlType))];
  const filterActive =
    activeFilters.status !== "all" ||
    Boolean(activeFilters.controlType) ||
    Boolean(activeFilters.query);
  const activeFilterCount = [
    activeFilters.status !== "all",
    Boolean(activeFilters.controlType),
    Boolean(activeFilters.query),
  ].filter(Boolean).length;

  useEffect(() => {
    if (!selectedEventId) return;
    document
      .getElementById(`session-event-${selectedEventId}`)
      ?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [projection, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      router.replace(buildSessionHref(searchParams.toString(), { event: null }), {
        scroll: false,
      });
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [router, searchParams, selectedEventId]);

  useEffect(() => {
    function handleFilterShortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (event.key === "Escape") {
        if (filtersRef.current?.open) {
          filtersRef.current.open = false;
          event.preventDefault();
        }
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }
      if (event.key.toLowerCase() === "f" && filtersRef.current) {
        filtersRef.current.open = !filtersRef.current.open;
        event.preventDefault();
      }
    }
    window.addEventListener("keydown", handleFilterShortcut);
    return () => window.removeEventListener("keydown", handleFilterShortcut);
  }, []);

  function selectEvent(eventId: string) {
    navigate({ event: selectedEventId === eventId ? null : eventId });
  }

  function downloadCalendar(events: readonly SessionEventView[]) {
    try {
      const content = generateSessionIcs(events);
      const url = URL.createObjectURL(
        new Blob([content], { type: "text/calendar;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = events.length === 1 ? `session-${events[0].date}.ics` : "session.ics";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setCalendarError(null);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      setCalendarError("Не удалось создать файл календаря. Проверьте данные события.");
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextProjection = projection === "feed" ? "calendar" : "feed";
    navigate({ projection: nextProjection });
  }

  if (!selectedSemester) {
    return (
      <EmptyState
        action={
          <button className={styles.secondaryButton} onClick={() => router.refresh()} type="button">
            Повторить
          </button>
        }
        className={styles.emptyState}
        description="Попробуйте обновить страницу немного позже."
        illustration="error"
        role="alert"
        title="Данные сессии пока не загружены"
      />
    );
  }

  const openGradesHref = (subjectId: string) =>
    `/grades?tab=calculator&subject=${encodeURIComponent(subjectId)}`;

  return (
    <div className={styles.sessionPage}>
      <ScheduleToolbar>
        <ScheduleSectionTabs
          active="session"
          lessonsHref={lessonsHref}
          sessionHref={sessionHref}
        />
        <div className={styles.sessionToolbarRow}>
          <label className={styles.semesterPicker}>
            <span>Семестр</span>
            <select
              aria-label="Выбрать семестр"
              onChange={(event) =>
                navigate({ semester: event.currentTarget.value, event: null, day: null })
              }
              value={selectedSemester.code}
            >
              {semesters.map((semester) => (
                <option key={semester.code} value={semester.code}>
                  {semester.number % 2 === 1 ? "Зимняя" : "Летняя"} сессия {academicYear}
                  {!semester.isCurrent && ` · ${semester.name.toLowerCase()}`}
                </option>
              ))}
            </select>
          </label>
          <div
            aria-label="Представление расписания сессии"
            className={styles.projectionSwitch}
            onKeyDown={onTabKeyDown}
            role="tablist"
          >
            {(["feed", "calendar"] as const).map((value) => (
              <button
                aria-selected={projection === value}
                className={projection === value ? styles.projectionActive : ""}
                key={value}
                onClick={() => navigate({ projection: value })}
                role="tab"
                type="button"
              >
                {value === "feed" ? "Лента" : "Календарь"}
              </button>
            ))}
          </div>
          <ScheduleFilterMenu
            activeCount={activeFilterCount}
            detailsRef={filtersRef}
            panelClassName={styles.sessionFilterPopup}
          >
            <div className={styles.filters}>
              <label>
                <span>Статус</span>
                <select
                  onChange={(event) => navigate({ status: event.currentTarget.value === "all" ? null : event.currentTarget.value }, true)}
                  value={activeFilters.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Форма контроля</span>
                <select
                  onChange={(event) => navigate({ control: event.currentTarget.value || null }, true)}
                  value={activeFilters.controlType}
                >
                  <option value="">Все формы</option>
                  {controlTypes.map((type) => (
                    <option key={type} value={type}>{controlTypeLabel(type)}</option>
                  ))}
                </select>
              </label>
              <label className={styles.searchField}>
                <span>Дисциплина или преподаватель</span>
                <input
                  defaultValue={activeFilters.query}
                  onBlur={(event) => {
                    if (event.currentTarget.value !== activeFilters.query) {
                      navigate({ q: event.currentTarget.value || null }, true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      navigate({ q: event.currentTarget.value || null }, true);
                    }
                  }}
                  placeholder="Поиск"
                  type="search"
                />
              </label>
              {filterActive && (
                <button
                  className={styles.resetButton}
                  onClick={() => navigate({ status: null, control: null, q: null }, true)}
                  type="button"
                >
                  Сбросить
                </button>
              )}
            </div>
          </ScheduleFilterMenu>
        </div>
        {filterActive && (
          <div className={styles.filterChips}>
            {activeFilters.status !== "all" && <span>{statusLabels[activeFilters.status]}</span>}
            {activeFilters.controlType && <span>{controlTypeLabel(activeFilters.controlType)}</span>}
            {activeFilters.query && <span>{activeFilters.query}</span>}
            <button onClick={() => navigate({ status: null, control: null, q: null }, true)} type="button">
              Сбросить
            </button>
          </div>
        )}
      </ScheduleToolbar>

      <header className={styles.sessionHeader}>
        <div>
          <span className={styles.eyebrow}>ЭКЗАМЕНЫ И РЕЗУЛЬТАТЫ</span>
          <div className={styles.sessionTitleRow}>
            <h2>Сессия</h2>
            <span className={`${styles.sessionStatus} ${sessionStatusClass}`}>
              {sessionStatus.label}
            </span>
          </div>
          <p>Расписание, итоги и пересдачи за учебный год {academicYear}</p>
        </div>
      </header>

      <section aria-label="Сводка сессии" className={styles.summaryGrid} data-stagger>
        <article className={styles.summaryCard}>
          <span>Сдано</span>
          <strong>{summary.passed} <small>из {summary.total}</small></strong>
        </article>
        <article className={styles.summaryCard}>
          <span>Следующее событие</span>
          {nearestEvent ? (
            <SessionDate event={nearestEvent} />
          ) : (
            <strong>Нет предстоящих</strong>
          )}
        </article>
        {summary.debts > 0 && (
          <article className={`${styles.summaryCard} ${styles.summaryDebt}`}>
            <span>Задолженности</span>
            <strong>{summary.debts}</strong>
          </article>
        )}
        <article className={styles.summaryCard}>
          <span>Средний балл</span>
          <strong>{summary.average === null ? "—" : summary.average.toFixed(2)}</strong>
        </article>
      </section>

      <div
        aria-label={`Прогресс сессии: сдано ${summary.passed}, запланировано ${Math.max(0, summary.total - summary.passed - summary.debts)}, не сдано ${summary.debts} из ${summary.total}`}
        className={styles.progressTrack}
        data-grow
        role="img"
      >
        <span
          className={styles.progressPassed}
          style={{ width: `${summary.total ? (summary.passed / summary.total) * 100 : 0}%` }}
        />
        <span
          className={styles.progressPlanned}
          style={{
            width: `${summary.total ? (Math.max(0, summary.total - summary.passed - summary.debts) / summary.total) * 100 : 0}%`,
          }}
        />
        <span
          className={styles.progressDebt}
          style={{ width: `${summary.total ? (summary.debts / summary.total) * 100 : 0}%` }}
        />
      </div>
      <div className={styles.progressLegend}>
        <span><i className={styles.legendPassed} />Сдано {summary.passed}</span>
        <span><i className={styles.legendPlanned} />Запланировано {Math.max(0, summary.total - summary.passed - summary.debts)}</span>
        <span><i className={styles.legendDebt} />Не сдано {summary.debts}</span>
      </div>

      {nearestEvent ? (
        <section aria-labelledby="nearest-session-title" className={styles.nearestCard}>
          <div className={styles.nearestTopline}>
            <span className={styles.nearestEyebrow}>БЛИЖАЙШЕЕ</span>
            <span className={`${styles.statusBadge} ${nearestEvent.resultStatus === "ACADEMIC_DEBT" || nearestEvent.status === "RESCHEDULED" ? styles.rescheduled : styles.planned}`}>
              {nearestEvent.resultStatus === "ACADEMIC_DEBT"
                ? "Пересдача назначена"
                : nearestEvent.status === "RESCHEDULED"
                  ? "Перенесено"
                  : "Следующее событие"}
            </span>
          </div>
          <div className={styles.nearestContent}>
            <div className={styles.nearestCopy}>
              <h3 id="nearest-session-title">{nearestEvent.subject}</h3>
              <p>
                {nearestEvent.controlLabel} · {nearestEvent.room} ·{" "}
                {nearestEvent.teacher}
              </p>
              <SessionDate event={nearestEvent} />
            </div>
            <div className={styles.nearestActions}>
              <button
                className={styles.primaryButton}
                onClick={() => downloadCalendar([nearestEvent])}
                type="button"
              >
                В календарь
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => selectEvent(nearestEvent.id)}
                type="button"
              >
                Подробнее
              </button>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          className={styles.emptyState}
          description={
            sessionStatus.unreported > 0
              ? `По прошедшим событиям ещё не внесено результатов: ${sessionStatus.unreported}.`
              : sessionStatus.code === "NOT_STARTED" &&
                  semesters.find((semester) => semester.code !== selectedSemester.code)?.events[0]
              ? `Ближайшая: ${semesters.find((semester) => semester.code !== selectedSemester.code)?.events[0].subject}`
              : sessionStatus.debts > 0
                ? `Сессия завершена. Задолженностей: ${sessionStatus.debts}.`
                : "Предстоящих экзаменов и зачётов пока нет."
          }
          illustration="session"
          title={
            sessionStatus.code === "NOT_STARTED"
              ? "Сессия ещё не началась"
              : sessionStatus.code === "IN_PROGRESS"
                ? "Ближайших событий нет"
                : "События сессии завершены"
          }
        />
      )}

      {insights.length > 0 && (
        <aside aria-label="Подсказки по расписанию сессии" className={styles.insights}>
          {insights.map((insight) => <p key={insight}>{insight}</p>)}
        </aside>
      )}

      <section aria-labelledby="session-schedule-title" className={styles.scheduleSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>ДАТЫ И ФОРМАТ</span>
            <h3 id="session-schedule-title">Расписание экзаменов</h3>
          </div>
          <button
            className={styles.secondaryButton}
            disabled={allEvents.length === 0}
            onClick={() => downloadCalendar(allEvents)}
            type="button"
          >
            Скачать всю сессию (.ics)
          </button>
        </div>

        <p aria-live="polite" className={styles.visuallyHidden}>
          Показано событий: {visibleEvents.length}
        </p>
        {calendarError && <p className={styles.errorMessage} role="alert">{calendarError}</p>}

        {projection === "feed" ? (
          <div className={styles.feedLayout}>
            <div className={styles.eventList} data-stagger>
              {eventGroups.map(({ date, events }) => (
                <section className={styles.dateGroup} key={date}>
                  <h4>
                    <DateTimeStack allDay value={date} />
                  </h4>
                  {events.map((event) => (
                    <EventCard
                      event={event}
                      key={event.id}
                      onSelect={() => selectEvent(event.id)}
                      selected={selectedEventId === event.id}
                      todayKey={todayKey}
                      nowTime={nowTime}
                      formulaHref={
                        (event.status === "PLANNED" || event.status === "RESCHEDULED") &&
                        !event.resultStatus &&
                        event.formulaAvailable
                          ? openGradesHref(event.subjectId)
                          : undefined
                      }
                    />
                  ))}
                </section>
              ))}
              {visibleEvents.length === 0 && (
                <EmptyState
                  className={styles.emptyState}
                  description={
                    filterActive
                      ? "Измените запрос или сбросьте фильтры."
                      : "Расписание сессии появится здесь."
                  }
                  illustration={filterActive ? "search" : "session"}
                  title={
                    filterActive ? "По этим фильтрам событий нет" : "Событий пока нет"
                  }
                />
              )}
            </div>
            {selectedEvent && (
              <EventDetails
                event={selectedEvent}
                gradeHref={
                  (selectedEvent.status === "PLANNED" ||
                    selectedEvent.status === "RESCHEDULED") &&
                  !selectedEvent.resultStatus &&
                  selectedEvent.formulaAvailable
                    ? openGradesHref(selectedEvent.subjectId)
                    : null
                }
                onClose={() => navigate({ event: null }, true)}
                onDownload={() => downloadCalendar([selectedEvent])}
              />
            )}
          </div>
        ) : (
          <div className={styles.calendarLayout}>
            <div className={styles.calendarPanel}>
              <div className={styles.calendarHeader}>
                <button
                  aria-label="Предыдущий месяц"
                  onClick={() => navigate({ date: shiftScheduleDate(monthAnchor, -1, "month") })}
                  type="button"
                >
                  ‹
                </button>
                <strong>{dateLabel(monthAnchor, { month: "long", year: "numeric" })}</strong>
                <button
                  aria-label="Следующий месяц"
                  onClick={() => navigate({ date: shiftScheduleDate(monthAnchor, 1, "month") })}
                  type="button"
                >
                  ›
                </button>
              </div>
              <div className={styles.calendarGrid}>
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                  <span className={styles.calendarWeekday} key={day}>{day}</span>
                ))}
                {calendarDays.map((date) => (
                  <button
                    aria-current={date === todayKey ? "date" : undefined}
                    aria-label={`${dateLabel(date, { day: "numeric", month: "long" })}${calendarEvents.has(date) ? `, событий: ${calendarEvents.get(date)?.length}` : ""}`}
                    aria-pressed={date === selectedDay}
                    className={`${styles.calendarDay} ${date.slice(0, 7) === monthAnchor.slice(0, 7) ? "" : styles.outsideMonth}`}
                    id={`session-date-${date}`}
                    key={date}
                    onKeyDown={(event) => {
                      const shift =
                        event.key === "ArrowLeft"
                          ? -1
                          : event.key === "ArrowRight"
                            ? 1
                            : event.key === "ArrowUp"
                              ? -7
                              : event.key === "ArrowDown"
                                ? 7
                                : 0;
                      if (shift === 0) return;
                      event.preventDefault();
                      const targetDay = shiftScheduleDate(date, shift, "day");
                      navigate({ day: targetDay, date: targetDay, event: null });
                      window.requestAnimationFrame(() =>
                        document
                          .getElementById(`session-date-${targetDay}`)
                          ?.focus(),
                      );
                    }}
                    onClick={() => navigate({ day: date, date: monthAnchor })}
                    type="button"
                  >
                    <span>{Number(date.slice(-2))}</span>
                    {calendarEvents.has(date) && <i aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>
            <section aria-live="polite" className={styles.dayEvents}>
              <h4>
                <DateTimeStack allDay value={selectedDay} />
              </h4>
              {selectedDayEvents.length ? selectedDayEvents.map((event) => (
                <EventCard
                  event={event}
                  key={event.id}
                  onSelect={() => selectEvent(event.id)}
                  selected={selectedEventId === event.id}
                  todayKey={todayKey}
                  nowTime={nowTime}
                  formulaHref={
                    (event.status === "PLANNED" || event.status === "RESCHEDULED") &&
                    !event.resultStatus &&
                    event.formulaAvailable
                      ? openGradesHref(event.subjectId)
                      : undefined
                  }
                />
              )) : <p>На этот день событий нет.</p>}
            </section>
            {selectedEvent && (
              <EventDetails
                event={selectedEvent}
                gradeHref={
                  (selectedEvent.status === "PLANNED" ||
                    selectedEvent.status === "RESCHEDULED") &&
                  !selectedEvent.resultStatus &&
                  selectedEvent.formulaAvailable
                    ? openGradesHref(selectedEvent.subjectId)
                    : null
                }
                onClose={() => navigate({ event: null }, true)}
                onDownload={() => downloadCalendar([selectedEvent])}
              />
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="session-results-title" className={styles.resultsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>ОФИЦИАЛЬНЫЕ ИТОГИ</span>
            <h3 id="session-results-title">Результаты сессии</h3>
          </div>
        </div>
        {selectedSemester.subjects.some((subject) => subject.resultStatus) ? (
          <div className={styles.resultList}>
            {selectedSemester.subjects
              .filter((subject) => subject.resultStatus)
              .map((subject) => (
                <details className={styles.resultRow} key={subject.id}>
                  <summary>
                    <span className={styles.resultSubject}>
                      <strong>{subject.name}</strong>
                      <small>{subject.controlLabel}</small>
                      {subject.resultDate ? (
                        <DateTimeStack allDay value={subject.resultDate} />
                      ) : (
                        <small>Дата не указана</small>
                      )}
                    </span>
                    <span className={subject.resultStatus === "ACADEMIC_DEBT" ? styles.resultDebt : styles.resultPassed}>
                      {subject.resultStatus === "ACADEMIC_DEBT" ? "Не сдано" : subject.resultValue}
                    </span>
                    <span className={styles.attemptCount}>Попытка №{subject.attemptCount}</span>
                  </summary>
                  <div className={styles.attemptHistory}>
                    <strong>История попыток</strong>
                    {subject.attempts.map((attempt) => (
                      <div
                        className={styles.attempt}
                        key={`${subject.id}-${attempt.number}`}
                      >
                        <span>
                          №{attempt.number} · {attempt.value}
                        </span>
                        <DateTimeStack allDay align="end" value={attempt.date} />
                      </div>
                    ))}
                    {subject.attempts.length === 0 && <p>История попыток не опубликована.</p>}
                  </div>
                </details>
              ))}
          </div>
        ) : (
          <EmptyState
            className={styles.emptyState}
            description="Официальные оценки и зачёты отображаются здесь после публикации."
            illustration="session"
            title="Результаты появятся после сдачи экзаменов"
          />
        )}
      </section>

      <section aria-labelledby="session-debts-title" className={styles.debtsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>ПЛАН ДЕЙСТВИЙ</span>
            <h3 id="session-debts-title">Долги и пересдачи</h3>
          </div>
        </div>
        {selectedSemester.subjects.some((subject) => subject.resultStatus === "ACADEMIC_DEBT") ? (
          <div className={styles.debtList}>
            {selectedSemester.subjects
              .filter((subject) => subject.resultStatus === "ACADEMIC_DEBT")
              .map((subject) => {
                const resit = subject.events.find(
                  (event) =>
                    (event.status === "PLANNED" ||
                      event.status === "RESCHEDULED") &&
                    event.date >= todayKey &&
                    (!event.resultDate || event.date > event.resultDate),
                );
                return (
                  <article className={styles.debtCard} key={subject.id}>
                    <div>
                      <span className={styles.statusBadge + " " + styles.debt}>Академическая задолженность</span>
                      <h4>{subject.name}</h4>
                      <p>Попыток: {subject.attemptCount} · {subject.teacher}</p>
                      {resit ? (
                        <div className={styles.riskNote}>
                          <span>Пересдача назначена</span>
                          <SessionDate event={resit} />
                        </div>
                      ) : (
                        <p className={styles.riskNote}>
                          Дата пересдачи не назначена. Уточните срок ликвидации
                          задолженности в деканате.
                        </p>
                      )}
                    </div>
                    {resit ? (
                      <button
                        className={styles.secondaryButton}
                        onClick={() => downloadCalendar([resit])}
                        type="button"
                      >
                        Добавить пересдачу в календарь
                      </button>
                    ) : (
                      <button className={styles.secondaryButton} disabled type="button">
                        Дата пересдачи не назначена
                      </button>
                    )}
                  </article>
                );
              })}
          </div>
        ) : (
          <div className={styles.debtEmpty}>
            <span aria-hidden="true">✓</span>
            <strong>Задолженностей нет</strong>
            <p>Все опубликованные результаты сессии в порядке.</p>
          </div>
        )}
      </section>

    </div>
  );
}

function getSafeDateKey(value: string | null, fallback: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : fallback;
}

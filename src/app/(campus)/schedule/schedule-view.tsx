import Link from "next/link";
import type { ScheduleStatus } from "@/generated/prisma/enums";
import styles from "./schedule.module.css";

export type ScheduleLessonView = {
  id: string;
  subject: string;
  kindLabel: string;
  status: ScheduleStatus;
  startsAtIso: string;
  timeLabel: string;
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

export type ScheduleNextLessonView = {
  dayLabel: string;
  timeLabel: string;
  subject: string;
  room: string;
};

const statusPresentation: Record<
  ScheduleStatus,
  { icon: string; label: string; className: string }
> = {
  PLANNED: { icon: "✓", label: "По плану", className: styles.planned },
  RESCHEDULED: { icon: "↻", label: "Перенос", className: styles.rescheduled },
  CANCELLED: { icon: "×", label: "Отменено", className: styles.cancelled },
};

function LessonCards({ lessons }: { lessons: ScheduleLessonView[] }) {
  return (
    <ul className={styles.lessonList}>
      {lessons.map((lesson) => {
        const status = statusPresentation[lesson.status];
        const timeChanged = Boolean(
          lesson.originalTimeLabel &&
            lesson.originalTimeLabel !== lesson.timeLabel,
        );
        const roomChanged = Boolean(
          lesson.originalRoom && lesson.originalRoom !== lesson.room,
        );
        const changedBefore = [
          timeChanged ? lesson.originalTimeLabel : null,
          roomChanged ? `ауд. ${lesson.originalRoom}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        const changedAfter = [
          timeChanged ? lesson.timeLabel : null,
          roomChanged ? `ауд. ${lesson.room}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        const cancelledTime = lesson.originalTimeLabel ?? lesson.timeLabel;
        const cancelledRoom = lesson.originalRoom ?? lesson.room;

        return (
          <li
            className={`${styles.lessonCard} ${
              lesson.status === "RESCHEDULED" ? styles.rescheduledCard : ""
            } ${lesson.status === "CANCELLED" ? styles.cancelledCard : ""}`}
            id={`lesson-${lesson.id.split("-")[0]}`}
            key={lesson.id}
          >
            <div className={styles.lessonTimeColumn}>
              {lesson.status === "PLANNED" ||
              (lesson.status === "RESCHEDULED" && !timeChanged) ? (
                <time
                  className={styles.lessonTime}
                  dateTime={lesson.startsAtIso}
                >
                  {lesson.timeLabel}
                </time>
              ) : lesson.status === "RESCHEDULED" ? (
                <time
                  className={styles.lessonTime}
                  dateTime={lesson.startsAtIso}
                >
                  {lesson.timeLabel}
                </time>
              ) : (
                <span className={styles.lessonTime}>
                  <s>{cancelledTime}</s>
                </span>
              )}
            </div>
            <div className={styles.lessonContent}>
              <div className={styles.lessonTitleRow}>
                <h3 className={styles.subject}>{lesson.subject}</h3>
                <span className={`${styles.statusBadge} ${status.className}`}>
                  <span aria-hidden="true">{status.icon}</span>
                  {status.label}
                </span>
              </div>
              <p className={styles.kind}>
                {lesson.kindLabel} · {lesson.teacher}
              </p>
              {lesson.status === "RESCHEDULED" &&
                (timeChanged || roomChanged) && (
                  <div className={styles.scheduleChange}>
                    <p className={styles.changeWas}>
                      Было: <s>{changedBefore}</s>
                    </p>
                    <p className={styles.changeNow}>
                      Стало:{" "}
                      {timeChanged ? (
                        <time dateTime={lesson.startsAtIso}>
                          {changedAfter}
                        </time>
                      ) : (
                        changedAfter
                      )}
                    </p>
                  </div>
                )}
              {lesson.status === "CANCELLED" && (
                <p className={styles.cancelledDetails}>
                  Было: <s>{cancelledTime}</s>
                  {cancelledRoom ? `, ауд. ${cancelledRoom}` : ""}
                </p>
              )}
              {lesson.changeNote && (
                <p className={styles.changeNote}>{lesson.changeNote}</p>
              )}
            </div>
            <span className={styles.roomBadge}>
              Ауд. {lesson.status === "CANCELLED" ? cancelledRoom : lesson.room}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ScheduleView({
  days,
  todayKey,
  view,
  todayHref,
  weekHref,
  nextLesson,
}: {
  days: ScheduleDayView[];
  todayKey: string;
  view: "today" | "week";
  todayHref: string;
  weekHref: string;
  nextLesson: ScheduleNextLessonView | null;
}) {
  const today = days.find((day) => day.key === todayKey);
  const todayLessons = today?.lessons ?? [];

  return (
    <div className={styles.schedulePage}>
      <section className={styles.weekHero}>
        <span className={styles.weekIcon} aria-hidden="true">
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
            {view === "week" ? "Текущая неделя" : "Расписание на сегодня"}
          </strong>
          <span>
            {days[0]?.label} — {days[days.length - 1]?.label}
          </span>
        </div>
        <span className={styles.weekHeroArt} aria-hidden="true" />
      </section>

      <nav className={styles.viewSwitch} aria-label="Период расписания">
        <Link
          aria-current={view === "today" ? "page" : undefined}
          className={styles.viewButton}
          href={todayHref}
        >
          День
        </Link>
        <Link
          aria-current={view === "week" ? "page" : undefined}
          className={styles.viewButton}
          href={weekHref}
        >
          Неделя
        </Link>
      </nav>

      {view === "today" ? (
        <section>
          <h2 className={styles.dayHeading}>{today?.label}</h2>
          {todayLessons.length > 0 ? (
            <LessonCards lessons={todayLessons} />
          ) : (
            <div className={styles.emptyState} aria-live="polite">
              <strong>Сегодня занятий нет</strong>
              {nextLesson ? (
                <p>
                  Ближайшее: {nextLesson.dayLabel}, {nextLesson.timeLabel},{" "}
                  {nextLesson.subject}, ауд. {nextLesson.room}
                </p>
              ) : (
                <p>Ближайших занятий пока нет.</p>
              )}
              <Link className={styles.emptyLink} href={weekHref}>
                Посмотреть неделю
              </Link>
            </div>
          )}
        </section>
      ) : (
        <>
          <nav className={styles.weekDays} aria-label="Дни недели">
            {days.map((day) => {
              const [weekday, date] = day.label.split(", ");
              return (
                <a
                  aria-current={day.key === todayKey ? "date" : undefined}
                  className={styles.weekDay}
                  href={`#schedule-day-${day.key}`}
                  key={day.key}
                >
                  <strong>{weekday.slice(0, 2)}</strong>
                  <span>{date}</span>
                </a>
              );
            })}
          </nav>
          <div className={styles.dayList}>
            {days.map((day) => (
              <section
                aria-current={day.key === todayKey ? "date" : undefined}
                className={`${styles.dayGroup} ${
                  day.key === todayKey ? styles.todayGroup : ""
                }`}
                id={`schedule-day-${day.key}`}
                key={day.key}
              >
                <div className={styles.dayTitleRow}>
                  <h2 className={styles.dayHeading}>{day.label}</h2>
                  {day.key === todayKey && (
                    <span className={styles.todayMark}>Сегодня</span>
                  )}
                </div>
                {day.lessons.length > 0 ? (
                  <LessonCards lessons={day.lessons} />
                ) : (
                  <p className={styles.emptyDay}>Занятий нет</p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import controls from "@/components/ui/controls.module.css";
import styles from "./week-strip.module.css";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export type WeekStripDay = {
  key: string;
  lessonCount: number;
  hasDeadline: boolean;
};

// Неделя на главной: день ведёт в расписание, точки — пары и сроки.
export function WeekStrip({
  days,
  todayKey,
  title,
}: {
  days: readonly WeekStripDay[];
  todayKey: string;
  title: string;
}) {
  return (
    <section aria-labelledby="week-strip-title" className={styles.week}>
      <h2 className={controls.visuallyHidden} id="week-strip-title">
        Неделя, {title}
      </h2>
      <ol className={styles.days}>
        {days.map((day, index) => {
          const isToday = day.key === todayKey;
          const details = [
            day.lessonCount > 0 ? `занятий: ${day.lessonCount}` : "занятий нет",
            day.hasDeadline ? "есть срок" : "",
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={day.key}>
              <Link
                aria-current={isToday ? "date" : undefined}
                aria-label={`${weekdays[index]}, ${Number(day.key.slice(8))}: ${details}`}
                className={styles.day}
                href={`/schedule?view=today&date=${day.key}`}
                title={details}
              >
                <span className={styles.weekday}>{weekdays[index]}</span>
                <span className={styles.date}>{Number(day.key.slice(8))}</span>
                <span aria-hidden="true" className={styles.dots}>
                  {day.lessonCount > 0 ? <i data-kind="lesson" /> : null}
                  {day.hasDeadline ? <i data-kind="deadline" /> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <Link
        aria-label={`Открыть месяц: ${title}`}
        className={styles.link}
        href="/schedule?view=month"
      >
        {title} →
      </Link>
    </section>
  );
}

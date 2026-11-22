import Link from "next/link";
import { formatMoscowTime } from "@/lib/campus-time";
import { formatRoom } from "@/lib/room-format";
import type { DayTimeline as Timeline } from "@/lib/day-timeline";
import type { TodayEvent } from "@/lib/today-view-utils";
import styles from "./day-timeline.module.css";

function describe(event: TodayEvent, isMain: boolean): string {
  return [
    `${formatMoscowTime(event.startsAt)}–${formatMoscowTime(event.endsAt)}`,
    event.title,
    event.typeLabel,
    formatRoom(event.room),
    event.status === "CANCELLED" ? "отменено" : null,
    isMain ? "показано выше" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** День целиком: где пары, где окна и что накладывается друг на друга. */
export function DayTimeline({
  timeline,
  mainId,
  now,
  label,
}: {
  timeline: Timeline;
  mainId: string;
  now: Date;
  label: string;
}) {
  return (
    <div className={styles.timeline}>
      <ol aria-hidden="true" className={styles.hours}>
        {timeline.hours.map((hour) => (
          <li key={hour.getTime()}>{formatMoscowTime(hour)}</li>
        ))}
      </ol>
      <div
        className={styles.track}
        style={{
          "--hours": timeline.hours.length - 1,
          "--lanes": timeline.lanes,
        } as React.CSSProperties}
      >
        {timeline.now === null ? null : (
          <span
            aria-hidden="true"
            className={styles.now}
            style={{ left: `${timeline.now}%` }}
          />
        )}
        <ul aria-label={label}>
          {timeline.items.map(({ event, lane, left, width }) => {
            const description = describe(event, event.id === mainId);
            return (
              <li
                key={event.id}
                style={{
                  "--lane": lane,
                  left: `${left}%`,
                  width: `${width}%`,
                } as React.CSSProperties}
              >
                <Link
                  aria-label={description}
                  className={styles.event}
                  data-cancelled={event.status === "CANCELLED" || undefined}
                  data-kind={event.kind}
                  data-main={event.id === mainId || undefined}
                  data-past={
                    event.endsAt.getTime() <= now.getTime() || undefined
                  }
                  data-running={
                    (event.startsAt.getTime() <= now.getTime() &&
                      event.endsAt.getTime() > now.getTime()) ||
                    undefined
                  }
                  href={event.detailsHref}
                  style={{
                    "--done":
                      timeline.now === null
                        ? "0%"
                        : `${((timeline.now - left) / width) * 100}%`,
                  } as React.CSSProperties}
                  title={description}
                >
                  <span>
                    {event.kind === "session"
                      ? `${event.typeLabel} · ${event.title}`
                      : event.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

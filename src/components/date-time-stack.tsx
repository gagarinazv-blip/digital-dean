"use client";

import { useDemoNow } from "@/components/demo-now";
import { getDateStackLabels, parseStackDate } from "@/lib/date-stack";
import styles from "./date-time-stack.module.css";

export function DateTimeStack({
  value,
  end,
  allDay = false,
  kind = "event",
  done = false,
  align = "start",
  now,
  className,
}: {
  value: Date | string;
  end?: Date | string | null;
  allDay?: boolean;
  kind?: "event" | "deadline";
  done?: boolean;
  align?: "start" | "end";
  now?: Date | string;
  className?: string;
}) {
  const contextNow = useDemoNow();
  const labels = getDateStackLabels(parseStackDate(value), {
    now: now ? new Date(now) : contextNow,
    end: end ? parseStackDate(end) : null,
    allDay,
    kind,
    done,
  });

  return (
    <time
      className={[styles.stack, className].filter(Boolean).join(" ")}
      data-align={align}
      data-date-stack=""
      data-urgency={labels.urgency ?? undefined}
      dateTime={labels.dateTime}
      title={labels.title}
    >
      <span className={styles.day}>
        {labels.day}
        {labels.urgencyLabel ? (
          <span className={styles.mark}> · {labels.urgencyLabel}</span>
        ) : null}
      </span>
      {labels.detail ? (
        <span className={styles.detail}>{labels.detail}</span>
      ) : null}
    </time>
  );
}

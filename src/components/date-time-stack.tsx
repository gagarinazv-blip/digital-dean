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
  variant = "stack",
  hideDay = false,
  now,
  className,
}: {
  value: Date | string;
  end?: Date | string | null;
  allDay?: boolean;
  kind?: "event" | "deadline";
  done?: boolean;
  align?: "start" | "end";
  /**
   * stack — день и под ним время с отсчётом; moment — день и время в строку.
   */
  variant?: "stack" | "moment";
  /** День уже назван рядом, например в чипе срочности. */
  hideDay?: boolean;
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

  if (variant === "moment") {
    const text = [hideDay ? null : labels.day, labels.time]
      .filter(Boolean)
      .join(", ");
    return (
      <time
        className={[styles.inline, className].filter(Boolean).join(" ")}
        data-date-inline=""
        dateTime={labels.dateTime}
        title={labels.title}
      >
        {text}
      </time>
    );
  }

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

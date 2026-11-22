"use client";

import Link from "next/link";
import { NavArrowRight } from "iconoir-react";
import { DateTimeStack } from "@/components/date-time-stack";
import { useDemoNow } from "@/components/demo-now";
import { getDateStackLabels } from "@/lib/date-stack";
import { FitList } from "./fit-list";
import styles from "./today-lists.module.css";

export type TodayDeadline = {
  id: string;
  kind: "deadline" | "session";
  title: string;
  subject: string;
  dueAt: Date;
  endsAt: Date | null;
  href: string;
};

/** Срочность дедлайна — один чип; у экзаменов и зачётов его нет. */
export function getDeadlineChip(
  deadline: Pick<TodayDeadline, "kind" | "dueAt">,
  now: Date,
): { label: string; tone: "accent" | "danger" } | null {
  if (deadline.kind !== "deadline") return null;
  const labels = getDateStackLabels(deadline.dueAt, { now, kind: "deadline" });
  if (labels.urgency === "overdue") {
    return { label: "Просрочено", tone: "danger" };
  }
  return labels.urgency === "urgent"
    ? { label: labels.day, tone: "accent" }
    : null;
}

export function DeadlineList({
  deadlines,
  serverNow,
}: {
  deadlines: readonly TodayDeadline[];
  serverNow: Date;
}) {
  const now = useDemoNow() ?? serverNow;
  return (
    <FitList>
      {deadlines.map((deadline) => {
        const chip = getDeadlineChip(deadline, now);
        return (
          <li className={styles.row} key={deadline.id}>
            <Link className={styles.rowLink} href={deadline.href}>
              <span className={styles.rowText}>
                <span className={styles.title} title={deadline.title}>
                  {deadline.title}
                </span>
                <span className={styles.meta}>
                  <DateTimeStack
                    end={deadline.endsAt}
                    hideDay={chip?.tone === "accent"}
                    kind={deadline.kind === "deadline" ? "deadline" : "event"}
                    value={deadline.dueAt}
                    variant="moment"
                  />
                  <span className={styles.details} title={deadline.subject}>
                    {deadline.subject}
                  </span>
                </span>
              </span>
              {chip ? (
                <span className={styles.chip} data-tone={chip.tone}>
                  {chip.label}
                </span>
              ) : (
                <NavArrowRight aria-hidden="true" className={styles.arrow} />
              )}
            </Link>
          </li>
        );
      })}
    </FitList>
  );
}

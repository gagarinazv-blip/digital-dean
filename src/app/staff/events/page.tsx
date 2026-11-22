import { Suspense } from "react";
import { connection } from "next/server";
import { CampusLoading } from "@/components/campus-section";
import { SectionHeader } from "@/components/section-header";
import { getMoscowDateKey } from "@/lib/campus-time";
import { getDemoNow } from "@/lib/demo-date";
import { getDigestState } from "@/lib/event-approvals";
import { getStaffDigestEvents, getStaffDigestOverview } from "@/lib/event-data";
import {
  formatDigestWeekRange,
  getDigestWeek,
  getDigestWeekHref,
  getDigestWeekKey,
  groupEventsByStartDay,
  shiftDigestWeek,
} from "@/lib/event-digest";
import { requireStaffContext } from "@/lib/staff";
import { DigestPlanner, type PlannerWeekTab } from "./planner";
import styles from "./events.module.css";

type StaffEventsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// Неделя назад, выбранная и три вперёд: план готовят заранее.
const tabOffsets = [-1, 0, 1, 2, 3] as const;

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getRelativeLabel(weeks: number): string | null {
  if (weeks === 0) return "Эта неделя";
  if (weeks === 1) return "Следующая";
  return weeks === -1 ? "Прошлая" : null;
}

async function StaffEventsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  await requireStaffContext();
  const now = getDemoNow();
  const week = getDigestWeek(getSingleParam(params.week), now);
  const currentWeek = getDigestWeek(undefined, now);
  const weekKey = getDigestWeekKey(week);
  const firstWeek = shiftDigestWeek(week, tabOffsets[0]);
  const lastWeek = shiftDigestWeek(week, tabOffsets[tabOffsets.length - 1] + 1);
  const [events, overview] = await Promise.all([
    getStaffDigestEvents(week.startDate, shiftDigestWeek(week, 1).startDate),
    getStaffDigestOverview(firstWeek.startDate, lastWeek.startDate),
  ]);

  const tabs: PlannerWeekTab[] = tabOffsets.map((offset) => {
    const tabWeek = shiftDigestWeek(week, offset);
    const end = shiftDigestWeek(tabWeek, 1).startDate;
    const items = overview.filter(
      (event) => event.eventDate >= tabWeek.startDate && event.eventDate < end,
    );
    return {
      key: getDigestWeekKey(tabWeek),
      href: getDigestWeekHref(tabWeek, 0, undefined, "/staff/events"),
      range: formatDigestWeekRange(tabWeek),
      relative: getRelativeLabel(
        Math.round(
          (tabWeek.startDate.getTime() - currentWeek.startDate.getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        ),
      ),
      total: items.length,
      published: items.filter((event) => event.status === "PUBLISHED").length,
      state: getDigestState(items),
    };
  });

  return (
    <main className={styles.page}>
      <SectionHeader
        description="Готовьте недели заранее: черновики студенты не видят."
        eyebrow="Рабочее место"
        illustration="events"
        title="Дайджест событий"
        tone="wine"
      />
      <DigestPlanner
        currentHref={getDigestWeekHref(currentWeek, 0, undefined, "/staff/events")}
        days={groupEventsByStartDay(week, events).map((day) => ({
          ...day,
          isToday: day.dateKey === getMoscowDateKey(now),
        }))}
        // Состояние формы и сообщения принадлежат одной неделе.
        key={weekKey}
        nextHref={getDigestWeekHref(week, 1, undefined, "/staff/events")}
        previousHref={getDigestWeekHref(week, -1, undefined, "/staff/events")}
        range={formatDigestWeekRange(week)}
        tabs={tabs}
        weekKey={weekKey}
      />
    </main>
  );
}

export default function StaffEventsPage({
  searchParams,
}: StaffEventsPageProps) {
  return (
    <Suspense fallback={<CampusLoading label="Дайджест событий" />}>
      <StaffEventsContent searchParams={searchParams ?? Promise.resolve({})} />
    </Suspense>
  );
}

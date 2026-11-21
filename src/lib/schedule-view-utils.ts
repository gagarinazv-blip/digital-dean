export type ScheduleViewMode = "today" | "week" | "month";
export type ScheduleDateUnit = "day" | "week" | "month";

export type ScheduleFilterState = {
  kind?: string;
  subject?: string;
  q?: string;
  changed?: boolean;
};

export type ScheduleLayoutInput = {
  id: string;
  startMinutes: number;
  endMinutes: number;
};

export type ScheduleLayoutEntry = {
  id: string;
  top: number;
  height: number;
  left: number;
  width: number;
};

export function parseScheduleView(value: unknown): ScheduleViewMode {
  if (value === "week" || value === "month") return value;
  return "today";
}

function parseDateKey(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new RangeError("Дата должна иметь формат ГГГГ-ММ-ДД.");
  }
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateKey
  ) {
    throw new RangeError("Дата содержит некорректное значение.");
  }
  return date;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftScheduleDate(
  dateKey: string,
  amount: number,
  unit: ScheduleDateUnit,
): string {
  if (!Number.isInteger(amount)) {
    throw new RangeError("Смещение даты должно быть целым числом.");
  }
  const date = parseDateKey(dateKey);

  if (unit === "day") {
    date.setUTCDate(date.getUTCDate() + amount);
    return toDateKey(date);
  }
  if (unit === "week") {
    date.setUTCDate(date.getUTCDate() + amount * 7);
    return toDateKey(date);
  }

  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return toDateKey(date);
}

export function getMonthCalendarDays(dateKey: string): string[] {
  const date = parseDateKey(dateKey);
  const monthStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const daysSinceMonday = (monthStart.getUTCDay() + 6) % 7;
  const firstDay = new Date(monthStart);
  firstDay.setUTCDate(firstDay.getUTCDate() - daysSinceMonday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstDay);
    day.setUTCDate(day.getUTCDate() + index);
    return toDateKey(day);
  });
}

export function buildScheduleHref(
  view: ScheduleViewMode,
  date: string,
  filters: ScheduleFilterState = {},
  lessonId?: string,
): string {
  const params = new URLSearchParams({ view, date });
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.q) params.set("q", filters.q);
  if (filters.changed) params.set("changed", "1");
  if (lessonId) params.set("lesson", lessonId);
  return `/schedule?${params.toString()}`;
}

export function calculateLessonLayout(
  items: readonly ScheduleLayoutInput[],
  rangeStart: number,
  rangeEnd: number,
): ScheduleLayoutEntry[] {
  const normalized = items
    .filter(
      (item) =>
        Number.isFinite(item.startMinutes) &&
        Number.isFinite(item.endMinutes) &&
        item.endMinutes > item.startMinutes &&
        item.endMinutes > rangeStart &&
        item.startMinutes < rangeEnd,
    )
    .map((item) => ({
      ...item,
      startMinutes: Math.max(item.startMinutes, rangeStart),
      endMinutes: Math.min(item.endMinutes, rangeEnd),
    }))
    .sort(
      (first, second) =>
        first.startMinutes - second.startMinutes ||
        first.endMinutes - second.endMinutes ||
        first.id.localeCompare(second.id),
    );

  const clusters: (typeof normalized)[] = [];
  for (const item of normalized) {
    const cluster = clusters.at(-1);
    const clusterEnd = cluster?.reduce(
      (latest, entry) => Math.max(latest, entry.endMinutes),
      Number.NEGATIVE_INFINITY,
    );
    if (!cluster || item.startMinutes >= (clusterEnd ?? 0)) {
      clusters.push([item]);
    } else {
      cluster.push(item);
    }
  }

  const result: ScheduleLayoutEntry[] = [];
  for (const cluster of clusters) {
    const active: { endMinutes: number; column: number }[] = [];
    const placements: { item: (typeof normalized)[number]; column: number }[] =
      [];
    let columns = 0;

    for (const item of cluster) {
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (active[index].endMinutes <= item.startMinutes) {
          active.splice(index, 1);
        }
      }

      const occupied = new Set(active.map(({ column }) => column));
      let column = 0;
      while (occupied.has(column)) column += 1;
      columns = Math.max(columns, column + 1);
      active.push({ endMinutes: item.endMinutes, column });
      placements.push({ item, column });
    }

    for (const { item, column } of placements) {
      result.push({
        id: item.id,
        top: item.startMinutes - rangeStart,
        height: Math.max(32, item.endMinutes - item.startMinutes),
        left: (column / columns) * 100,
        width: 100 / columns,
      });
    }
  }

  return result.sort((first, second) => first.top - second.top);
}

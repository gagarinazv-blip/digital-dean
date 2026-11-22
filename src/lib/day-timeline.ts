import { getMoscowDateKey } from "@/lib/campus-time";
import type { TodayEvent } from "@/lib/today-view-utils";

const HOUR = 60 * 60 * 1000;
const MIN_HOURS = 4;

export type DayTimelineItem = {
  event: TodayEvent;
  /** Дорожка: пересекающиеся события стоят одно под другим. */
  lane: number;
  left: number;
  width: number;
};

export type DayTimeline = {
  items: DayTimelineItem[];
  lanes: number;
  /** Начало каждого часа шкалы, включая последний. */
  hours: Date[];
  /** Положение «сейчас» в процентах или null, если день другой. */
  now: number | null;
};

/** Лента дня главной карточки. Null, если на неё нечего добавить. */
export function getDayTimeline(
  events: readonly TodayEvent[],
  main: TodayEvent,
  now: Date,
): DayTimeline | null {
  const dayKey = getMoscowDateKey(main.startsAt);
  const day = events
    .filter((event) => getMoscowDateKey(event.startsAt) === dayKey)
    .sort(
      (first, second) =>
        first.startsAt.getTime() - second.startsAt.getTime() ||
        first.endsAt.getTime() - second.endsAt.getTime(),
    );
  if (day.length < 2) return null;

  // Смещение Москвы — целое число часов, поэтому округление до часа верное.
  const start =
    Math.floor(Math.min(...day.map((event) => event.startsAt.getTime())) / HOUR) *
    HOUR;
  const lastHour =
    Math.ceil(Math.max(...day.map((event) => event.endsAt.getTime())) / HOUR) *
    HOUR;
  const end = Math.max(lastHour, start + MIN_HOURS * HOUR);
  const percent = (time: number) => ((time - start) / (end - start)) * 100;

  const laneEnds: number[] = [];
  const items = day.map((event) => {
    const from = event.startsAt.getTime();
    const free = laneEnds.findIndex((laneEnd) => laneEnd <= from);
    const lane = free === -1 ? laneEnds.length : free;
    laneEnds[lane] = event.endsAt.getTime();
    return {
      event,
      lane,
      left: percent(from),
      width: percent(event.endsAt.getTime()) - percent(from),
    };
  });

  return {
    items,
    lanes: laneEnds.length,
    hours: Array.from(
      { length: (end - start) / HOUR + 1 },
      (_, index) => new Date(start + index * HOUR),
    ),
    now:
      now.getTime() >= start && now.getTime() <= end
        ? percent(now.getTime())
        : null,
  };
}

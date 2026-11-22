import type {
  ScheduleKind,
  ScheduleStatus,
} from "../src/generated/prisma/enums";
import { UNIVERSITY_TIME_ZONE } from "../src/lib/campus-time";

type TargetLogin = "student.alpha" | "student.beta";

export type TargetScheduleSeedRow = {
  login: TargetLogin;
  subjectIndex: number;
  date: Date;
  startTime: string;
  endTime: string;
  originalStartTime: string | null;
  originalEndTime: string | null;
  room: string;
  originalRoom: string | null;
  kind: ScheduleKind;
  status: ScheduleStatus;
  changeNote: string | null;
};

const alphaTimes = [
  ["08:30", "10:00"],
  ["10:15", "11:45"],
  ["12:00", "13:30"],
  ["14:30", "16:00"],
] as const;

const betaTimes = [
  ["09:00", "10:30"],
  ["10:45", "12:15"],
  ["13:00", "14:30"],
  ["15:00", "16:30"],
] as const;

const alphaRooms = [
  "МО-101, ауд. 101",
  "МО-101, ауд. 203",
  "МО-101, ауд. 305",
  "МО-101, ауд. 402",
] as const;

const betaRooms = [
  "ЗР-203, ауд. 21",
  "ЗР-203, ауд. 34",
  "ЗР-203, ауд. 46",
  "ЗР-203, ауд. 58",
] as const;

const alphaLessonCounts = [3, 2, 4, 3, 2] as const;
const betaLessonCounts = [2, 3, 2, 4, 3] as const;
const scheduleKinds: ScheduleKind[] = [
  "LECTURE",
  "SEMINAR",
  "PRACTICE",
];

const moscowDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: UNIVERSITY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getNumericParts(date: Date): Record<string, number> {
  return Object.fromEntries(
    moscowDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function currentWeekMonday(now: Date): Date {
  const parts = getNumericParts(now);
  const today = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  );
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  today.setUTCDate(today.getUTCDate() - daysSinceMonday);
  return today;
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function buildTargetScheduleSeed(
  now = new Date(),
): TargetScheduleSeedRow[] {
  const monday = currentWeekMonday(now);
  const rows: TargetScheduleSeedRow[] = [];

  for (const login of ["student.alpha", "student.beta"] as const) {
    const isAlpha = login === "student.alpha";
    const times = isAlpha ? alphaTimes : betaTimes;
    const rooms = isAlpha ? alphaRooms : betaRooms;
    const lessonCounts = isAlpha ? alphaLessonCounts : betaLessonCounts;

    for (const weekOffset of [-14, -7, 0, 7, 14]) {
      for (let weekdayIndex = 0; weekdayIndex < 5; weekdayIndex += 1) {
        if (!isAlpha && weekdayIndex === 2) continue;

        const date = addUtcDays(monday, weekOffset + weekdayIndex);
        const lessonCount = lessonCounts[weekdayIndex];
        for (let lessonIndex = 0; lessonIndex < lessonCount; lessonIndex += 1) {
          const [originalStartTime, originalEndTime] =
            times[lessonIndex % times.length];
          const originalRoom = rooms[lessonIndex % rooms.length];
          const subjectIndex = isAlpha
            ? lessonIndex % 3
            : 3 + (lessonIndex % 2);
          const isCurrentWeek = weekOffset === 0;
          const timeAndRoomMove =
            isCurrentWeek &&
            weekdayIndex === 0 &&
            lessonIndex === 0;
          const roomOnlyMove =
            isAlpha &&
            isCurrentWeek &&
            weekdayIndex === 3 &&
            lessonIndex === 0;
          const isMoved = timeAndRoomMove || roomOnlyMove;
          const isCancelled =
            isCurrentWeek &&
            ((isAlpha && weekdayIndex === 1 && lessonIndex === 1) ||
              (!isAlpha && weekdayIndex === 4 && lessonIndex === 0));

          let startTime: string = originalStartTime;
          let endTime: string = originalEndTime;
          let room: string = originalRoom;
          let changeNote: string | null = null;

          if (timeAndRoomMove && isAlpha) {
            startTime = "08:00";
            endTime = "09:30";
            room = "МО-101, ауд. 108";
            changeNote = "Преподаватель на конференции";
          } else if (timeAndRoomMove) {
            startTime = "08:15";
            endTime = "09:45";
            room = "ЗР-203, ауд. 29";
            changeNote = "Время и аудитория занятия изменены.";
          } else if (roomOnlyMove) {
            room = "МО-101, ауд. 109";
            changeNote = "Аудитория изменена.";
          } else if (isCancelled && isAlpha) {
            changeNote = "Занятие отменено, материалы в чате группы";
          } else if (isCancelled) {
            changeNote = "Занятие отменено.";
          }

          rows.push({
            login,
            subjectIndex,
            date,
            startTime,
            endTime,
            originalStartTime: isMoved ? originalStartTime : null,
            originalEndTime: isMoved ? originalEndTime : null,
            room,
            originalRoom: isMoved ? originalRoom : null,
            kind: scheduleKinds[lessonIndex % scheduleKinds.length],
            status: isCancelled
              ? "CANCELLED"
              : isMoved
                ? "RESCHEDULED"
                : "PLANNED",
            changeNote,
          });
        }
      }
    }
  }

  return rows;
}

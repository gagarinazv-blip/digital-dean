import {
  formatUniversityDateTime,
  getMoscowDateKey,
  UNIVERSITY_TIME_ZONE,
} from "@/lib/campus-time";

export type CalendarScheduleLesson = {
  id: string;
  subject: string;
  startsAtIso: string;
  endsAtIso: string;
  kindLabel: string;
  room: string;
  teacher: string;
  status: "PLANNED" | "RESCHEDULED" | "CANCELLED";
  changeNote: string | null;
};

const utf8Encoder = new TextEncoder();

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("В расписании обнаружена некорректная дата.");
  }
  return date;
}

function formatUtcDate(value: string): string {
  return parseDate(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function formatUniversityLocalDateTime(value: string): string {
  const date = parseDate(value);
  const dateKey = getMoscowDateKey(date).replaceAll("-", "");
  const time = formatUniversityDateTime(date, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).replace(":", "");
  return `${dateKey}T${time}00`;
}

function foldLine(line: string): string {
  const chunks: string[] = [];
  let chunk = "";
  let bytes = 0;

  for (const character of line) {
    const characterBytes = utf8Encoder.encode(character).length;
    if (bytes + characterBytes > 75) {
      chunks.push(chunk);
      chunk = ` ${character}`;
      bytes = 1 + characterBytes;
    } else {
      chunk += character;
      bytes += characterBytes;
    }
  }
  chunks.push(chunk);
  return chunks.join("\r\n");
}

export function generateScheduleIcs(
  lessons: readonly CalendarScheduleLesson[],
  generatedAt = new Date(),
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Campus OS//Schedule//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${UNIVERSITY_TIME_ZONE}`,
    "X-WR-CALNAME:Campus OS — расписание",
    "BEGIN:VTIMEZONE",
    `TZID:${UNIVERSITY_TIME_ZONE}`,
    `X-LIC-LOCATION:${UNIVERSITY_TIME_ZONE}`,
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:MSK",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const lesson of lessons) {
    const description = [
      lesson.kindLabel,
      `Преподаватель: ${lesson.teacher}`,
      `Аудитория: ${lesson.room}`,
      lesson.changeNote,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(lesson.id)}@campus-os`,
      `DTSTAMP:${formatUtcDate(generatedAt.toISOString())}`,
      `DTSTART;TZID=${UNIVERSITY_TIME_ZONE}:${formatUniversityLocalDateTime(lesson.startsAtIso)}`,
      `DTEND;TZID=${UNIVERSITY_TIME_ZONE}:${formatUniversityLocalDateTime(lesson.endsAtIso)}`,
      `SUMMARY:${escapeText(lesson.subject)}`,
      `LOCATION:${escapeText(lesson.room)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `STATUS:${lesson.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

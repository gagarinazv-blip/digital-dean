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

function formatUtcDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("В расписании обнаружена некорректная дата.");
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
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
    "X-WR-TIMEZONE:Europe/Moscow",
    "X-WR-CALNAME:Campus OS — расписание",
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
      `DTSTART:${formatUtcDate(lesson.startsAtIso)}`,
      `DTEND:${formatUtcDate(lesson.endsAtIso)}`,
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

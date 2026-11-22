import { UNIVERSITY_TIME_ZONE } from "@/lib/campus-time";
import {
  escapeText,
  foldLine,
  formatUniversityLocalDateTime,
  formatUtcDate,
  universityTimeZoneLines,
} from "@/lib/schedule-ics";

export type CalendarDeadline = {
  id: string;
  title: string;
  subject: string;
  topic: string | null;
  location: string | null;
  dueAt: Date;
};

export function generateDeadlineIcs(
  deadline: CalendarDeadline,
  generatedAt: Date,
  { withReminder = false }: { withReminder?: boolean } = {},
): string {
  const description = [
    deadline.subject,
    deadline.topic && `Тема: ${deadline.topic}`,
  ]
    .filter(Boolean)
    .join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AKSIUM//Deadlines//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${UNIVERSITY_TIME_ZONE}`,
    ...universityTimeZoneLines,
    "BEGIN:VEVENT",
    `UID:deadline-${escapeText(deadline.id)}@campus-os`,
    `DTSTAMP:${formatUtcDate(generatedAt.toISOString())}`,
    `DTSTART;TZID=${UNIVERSITY_TIME_ZONE}:${formatUniversityLocalDateTime(deadline.dueAt.toISOString())}`,
    `SUMMARY:${escapeText(`Срок: ${deadline.title}`)}`,
    ...(deadline.location ? [`LOCATION:${escapeText(deadline.location)}`] : []),
    `DESCRIPTION:${escapeText(description)}`,
    ...(withReminder
      ? [
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeText(`Завтра срок: ${deadline.title}`)}`,
          "TRIGGER:-P1D",
          "END:VALARM",
        ]
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

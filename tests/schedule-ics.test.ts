import { describe, expect, it } from "vitest";
import { generateScheduleIcs } from "../src/lib/schedule-ics";

describe("generateScheduleIcs", () => {
  it("exports local Moscow event times and escapes event text", () => {
    const output = generateScheduleIcs(
      [
        {
          id: "17-2026-11-16",
          subject: "Сети, связь; важная\nстрока\\",
          startsAtIso: "2026-11-16T05:30:00.000Z",
          endsAtIso: "2026-11-16T07:00:00.000Z",
          kindLabel: "Лекция",
          room: "МО, ауд. 101",
          teacher: "Иванов",
          status: "PLANNED",
          changeNote: null,
        },
        {
          id: "18-2026-11-17",
          subject: "Отменённая пара",
          startsAtIso: "2026-11-17T06:00:00.000Z",
          endsAtIso: "2026-11-17T07:30:00.000Z",
          kindLabel: "Практика",
          room: "А-12",
          teacher: "Петров",
          status: "CANCELLED",
          changeNote: "Занятие отменено.",
        },
      ],
      new Date("2026-11-15T12:00:00.000Z"),
    );

    expect(output).toContain("X-WR-TIMEZONE:Europe/Moscow");
    expect(output).toContain("TZID:Europe/Moscow");
    expect(output).toContain("DTSTART;TZID=Europe/Moscow:20261116T083000");
    expect(output).toContain("DTEND;TZID=Europe/Moscow:20261116T100000");
    expect(output).toContain("SUMMARY:Сети\\, связь\\; важная\\nстрока\\\\");
    expect(output).toContain("LOCATION:МО\\, ауд. 101");
    expect(output).toContain("STATUS:CANCELLED");
    expect(output).toContain("DTSTAMP:20261115T120000Z");
  });

  it("folds long UTF-8 lines to the iCalendar byte limit", () => {
    const output = generateScheduleIcs([
      {
        id: "long-event",
        subject: "Очень длинное название занятия ".repeat(8),
        startsAtIso: "2026-11-16T05:30:00.000Z",
        endsAtIso: "2026-11-16T07:00:00.000Z",
        kindLabel: "Лекция",
        room: "А-12",
        teacher: "Иванов",
        status: "PLANNED",
        changeNote: null,
      },
    ]);

    for (const line of output.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(output).toContain("\r\n ");
  });

  it("rejects malformed dates instead of exporting an invalid calendar", () => {
    expect(() =>
      generateScheduleIcs([
        {
          id: "broken",
          subject: "Пара",
          startsAtIso: "not-a-date",
          endsAtIso: "2026-11-16T07:00:00.000Z",
          kindLabel: "Лекция",
          room: "А-12",
          teacher: "Иванов",
          status: "PLANNED",
          changeNote: null,
        },
      ]),
    ).toThrow("В расписании обнаружена некорректная дата.");
  });
});

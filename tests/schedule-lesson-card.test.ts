import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  LessonAgenda,
  type ScheduleDayView,
} from "../src/app/(campus)/schedule/schedule-view";

describe("schedule day drawer lesson card", () => {
  it("keeps long subject and teacher text available in the full-width card", () => {
    const subject =
      "История вымышленных цивилизаций и сравнительный анализ древних культур";
    const teacher =
      "Профессор Лира Северная, доктор исторических наук и руководитель кафедры";
    const day: ScheduleDayView = {
      key: "2026-11-20",
      label: "пятница, 20 ноября",
      lessons: [
        {
          id: "42_2026-11-20",
          databaseId: "42",
          dateKey: "2026-11-20",
          subject,
          kind: "LECTURE",
          kindLabel: "Лекция",
          status: "PLANNED",
          startsAtIso: "2026-11-20T05:30:00.000Z",
          endsAtIso: "2026-11-20T07:00:00.000Z",
          startsAtMinutes: 8 * 60 + 30,
          endsAtMinutes: 10 * 60,
          timeLabel: "08:30–10:00",
          originalDateLabel: null,
          originalTimeLabel: null,
          originalRoom: null,
          room: "МО-101, ауд. 101",
          teacher,
          changeNote: null,
        },
      ],
    };

    const html = renderToStaticMarkup(
      createElement(LessonAgenda, { day, openLesson: vi.fn() }),
    );

    expect(html).toContain(`title="${subject}"`);
    expect(html).toContain(subject);
    expect(html).toContain(teacher);
    expect(html).toContain('lang="ru"');
  });
});

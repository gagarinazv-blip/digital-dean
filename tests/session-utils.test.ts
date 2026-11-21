import { describe, expect, it } from "vitest";
import {
  buildSessionHref,
  filterSessionEvents,
  findSessionInsights,
  generateSessionIcs,
  getSessionCountdown,
  getSessionEventStatusLabel,
  getSessionNotificationPlan,
  getSessionReminderCandidates,
  getSessionStatus,
  groupSessionEventsByDate,
  parseSessionFilters,
  summarizeSession,
  type SessionEventForUtils,
} from "@/lib/session-utils";

function event(
  overrides: Partial<SessionEventForUtils> = {},
): SessionEventForUtils {
  return {
    id: "session-1",
    subject: "История цивилизаций",
    date: "2026-12-01",
    startTime: "09:00",
    endTime: "10:30",
    status: "PLANNED",
    resultStatus: null,
    resultValue: null,
    resultDate: null,
    controlType: "EXAM",
    teacher: "Мария Иванова",
    room: "Корпус А, аудитория 101",
    ...overrides,
  };
}

describe("session utilities", () => {
  it("summarizes passed results, debts and numeric average without counting credits", () => {
    expect(
      summarizeSession(
        [
          event({ resultStatus: "PASSED", resultValue: "5" }),
          event({
            id: "session-2",
            resultStatus: "PASSED",
            resultValue: "4",
            controlType: "CREDIT",
          }),
          event({ id: "session-3", resultStatus: "ACADEMIC_DEBT", resultValue: "2" }),
        ],
        4,
      ),
    ).toEqual({ passed: 2, total: 4, debts: 1, average: 5 });
    expect(summarizeSession([], 0).average).toBeNull();
  });

  it("derives session status from results and event times at day boundaries", () => {
    expect(getSessionStatus([], "2026-11-22").code).toBe("NOT_STARTED");
    expect(
      getSessionStatus(
        [
          event({
            date: "2026-11-25",
            resultStatus: "PASSED",
            resultValue: "5",
          }),
        ],
        "2026-11-22",
      ).code,
    ).toBe("COMPLETED");
    expect(
      getSessionStatus(
        [],
        "2026-11-22",
        "09:00",
        [
          event({
            date: "2026-11-25",
            resultStatus: "PASSED",
            resultValue: "5",
          }),
        ],
      ).code,
    ).toBe("COMPLETED");
    expect(
      getSessionStatus(
        [event({ status: "CANCELLED" })],
        "2026-11-22",
      ).code,
    ).toBe("NOT_STARTED");
    expect(
      getSessionStatus(
        [event({ date: "2026-11-21" })],
        "2026-11-22",
        "09:00",
      ),
    ).toMatchObject({
      code: "COMPLETED",
      label: "Завершена",
      started: 1,
      unreported: 1,
    });
    expect(getSessionStatus([event()], "2026-11-22", "09:00").code).toBe(
      "NOT_STARTED",
    );
    expect(
      getSessionStatus(
        [event({ date: "2026-11-21" }), event({ id: "future" })],
        "2026-11-22",
        "09:00",
      ).code,
    ).toBe("IN_PROGRESS");
    expect(
      getSessionStatus(
        [event({ date: "2026-11-21", resultStatus: "ACADEMIC_DEBT" })],
        "2026-11-22",
        "09:00",
      ).label,
    ).toBe("Завершена, есть задолженности: 1");
    expect(
      getSessionStatus(
        [
          event({
            date: "2026-11-22",
            startTime: "09:00",
            endTime: "10:30",
          }),
        ],
        "2026-11-22",
        "08:59",
      ).code,
    ).toBe("NOT_STARTED");
    expect(
      getSessionStatus(
        [
          event({
            date: "2026-11-22",
            startTime: "09:00",
            endTime: "10:30",
          }),
        ],
        "2026-11-22",
        "09:00",
      ).code,
    ).toBe("IN_PROGRESS");
    expect(
      getSessionStatus(
        [
          event({
            date: "2026-11-22",
            startTime: "09:00",
            endTime: "10:30",
          }),
        ],
        "2026-11-22",
        "10:30",
      ).code,
    ).toBe("COMPLETED");
    expect(
      getSessionStatus(
        [
          event({
            date: "2026-11-23",
            resultStatus: "ACADEMIC_DEBT",
            resultDate: "2026-11-21",
          }),
        ],
        "2026-11-22",
        "09:00",
      ).code,
    ).toBe("IN_PROGRESS");
  });

  it("labels past events without results instead of showing them as upcoming", () => {
    expect(
      getSessionEventStatusLabel(
        event({ date: "2026-11-21" }),
        "2026-11-22",
        "09:00",
      ),
    ).toBe("Результат не внесён");
    expect(
      getSessionEventStatusLabel(
        event({ date: "2026-11-22", endTime: "10:00" }),
        "2026-11-22",
        "10:00",
      ),
    ).toBe("Результат не внесён");
    expect(
      getSessionEventStatusLabel(
        event({ date: "2026-11-22", endTime: "10:00" }),
        "2026-11-22",
        "09:59",
      ),
    ).toBe("Запланировано");
    expect(
      getSessionEventStatusLabel(
        event({
          date: "2026-11-23",
          resultStatus: "ACADEMIC_DEBT",
          resultDate: "2026-11-21",
        }),
        "2026-11-22",
        "09:00",
      ),
    ).toBe("Пересдача назначена");
  });

  it("filters by upcoming status, control form and text", () => {
    const events = [
      event(),
      event({
        id: "session-2",
        subject: "Математика",
        resultStatus: "PASSED",
        resultValue: "4",
      }),
      event({
        id: "session-3",
        subject: "Анализ",
        resultStatus: "ACADEMIC_DEBT",
      }),
    ];
    expect(
      filterSessionEvents(
        events,
        { status: "upcoming", controlType: "EXAM", query: "иванова" },
        "2026-11-30",
      ).map(({ id }) => id),
    ).toEqual(["session-1"]);
    expect(
      filterSessionEvents(
        events,
        { status: "debts", controlType: "", query: "" },
        "2026-11-30",
      ).map(({ id }) => id),
    ).toEqual(["session-3"]);
    expect(
      filterSessionEvents(
        [
          event({
            id: "resit",
            date: "2026-11-23",
            resultStatus: "ACADEMIC_DEBT",
            resultValue: "2",
            resultDate: "2026-11-20",
          }),
        ],
        { status: "upcoming", controlType: "", query: "" },
        "2026-11-22",
      ).map(({ id }) => id),
    ).toEqual(["resit"]);
  });

  it("reads URL filters and preserves schedule parameters when opening an event", () => {
    expect(
      parseSessionFilters("?section=session&status=debts&control=EXAM&q=graph"),
    ).toEqual({ status: "debts", controlType: "EXAM", query: "graph" });
    expect(
      buildSessionHref(
        "view=month&date=2026-12-01&kind=LECTURE",
        { event: "42" },
      ),
    ).toBe(
      "/schedule?view=month&date=2026-12-01&kind=LECTURE&section=session&event=42",
    );
    expect(
      buildSessionHref("section=session&event=42", { event: null }),
    ).toBe("/schedule?section=session");
  });

  it("groups events chronologically across month and year boundaries", () => {
    expect(
      groupSessionEventsByDate([
        event({ id: "later", date: "2027-01-02" }),
        event({ id: "earlier", date: "2026-12-31" }),
      ]).map(({ date }) => date),
    ).toEqual(["2026-12-31", "2027-01-02"]);
  });

  it("detects same-day events, overlapping times and one-day gaps", () => {
    const insights = findSessionInsights([
      event({ id: "one", date: "2026-12-01", startTime: "09:00", endTime: "10:30" }),
      event({ id: "two", date: "2026-12-01", startTime: "10:00", endTime: "11:00", subject: "Математика" }),
      event({ id: "three", date: "2026-12-03", subject: "Физика" }),
    ]);
    expect(insights).toEqual(
      expect.arrayContaining([
        "Два экзамена в один день · 2026-12-01",
        "Конфликт времени · История цивилизаций и Математика",
        "Между «Математика» и «Физика» один день",
      ]),
    );
  });

  it("formats today, tomorrow and past countdowns", () => {
    expect(getSessionCountdown("2026-11-22", "09:00", "2026-11-22")).toBe("Сегодня");
    expect(
      getSessionCountdown("2026-11-23", "09:00", "2026-11-22", "08:00"),
    ).toBe("завтра, через 1 ч");
    expect(
      getSessionCountdown("2026-11-20", "09:00", "2026-11-22"),
    ).toBe("дата прошла 2 дня назад");
    expect(
      getSessionCountdown("2026-11-25", "12:00", "2026-11-22", "08:00"),
    ).toBe("через 3 дня 4 ч");
  });

  it("generates Moscow calendar events with stable UID, escaped text and a one-day alarm", () => {
    const content = generateSessionIcs(
      [event({ subject: "Алгоритмы, графы; поиск\\путь", date: "2026-12-01" })],
      new Date("2026-11-22T00:00:00.000Z"),
    );
    expect(content).toContain("TZID=Europe/Moscow");
    expect(content).toContain("UID:session-1@campus-os.local");
    expect(content).toContain("SUMMARY:Алгоритмы\\, графы\\; поиск\\\\путь");
    expect(content).toContain("TRIGGER:-P1D");
    expect(content).toContain("DTSTART;TZID=Europe/Moscow:20261201T090000");
  });

  it("returns only reminders due today for planned events", () => {
    const reminders = getSessionReminderCandidates(
      [
        event({ date: "2026-11-25" }),
        event({ id: "completed", date: "2026-11-25", status: "COMPLETED" }),
      ],
      "2026-11-22",
    );
    expect(reminders).toEqual([
      {
        eventId: "session-1",
        daysBefore: 3,
        date: "2026-11-22",
        title: "История цивилизаций: через 3 дня",
      },
    ]);
  });

  it("plans stable reminders, resit assignments and schedule change notices", () => {
    const resit = {
      ...event({
        date: "2026-11-23",
        resultStatus: "ACADEMIC_DEBT",
        resultValue: "2",
      }),
      resultDate: "2026-11-20",
      todayKey: "2026-11-22",
      room: "Аудитория 101",
    };
    const plan = getSessionNotificationPlan(resit);
    expect(plan.map(({ kind }) => kind)).toEqual([
      "RESIT_ASSIGNED",
      "REMINDER_1_DAY",
    ]);
    expect(getSessionNotificationPlan(resit)).toEqual(plan);
    expect(
      getSessionNotificationPlan({
        ...resit,
        status: "CANCELLED",
      }).map(({ kind }) => kind),
    ).toEqual(["CANCELLED"]);
    expect(
      getSessionNotificationPlan({
        ...resit,
        status: "RESCHEDULED",
      }).map(({ kind }) => kind),
    ).toEqual(["RESCHEDULED", "REMINDER_1_DAY"]);
  });
});

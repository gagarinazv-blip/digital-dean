import { UNIVERSITY_TIME_ZONE } from "./campus-time";

export type SessionStatusFilter = "all" | "upcoming" | "passed" | "debts";

export type SessionEventForUtils = {
  id: string;
  subjectId?: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "PLANNED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
  resultStatus: "PASSED" | "ACADEMIC_DEBT" | null;
  resultValue: string | null;
  resultDate?: string | null;
  controlType: string;
  teacher: string;
  room?: string;
};

export type SessionFilters = {
  status: SessionStatusFilter;
  controlType: string;
  query: string;
};

export type SessionStatusCode = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type SessionStatusSummary = {
  code: SessionStatusCode;
  label: string;
  started: number;
  upcoming: number;
  ongoing: number;
  unreported: number;
  debts: number;
};

export type SessionReminder = {
  eventId: string;
  daysBefore: 1 | 3;
  date: string;
  title: string;
};

export type SessionNotificationPlanInput = SessionEventForUtils & {
  resultDate: string | null;
  room: string;
  todayKey: string;
};

export type SessionNotificationPlanItem = {
  kind: "REMINDER_3_DAYS" | "REMINDER_1_DAY" | "RESIT_ASSIGNED" | "RESCHEDULED" | "CANCELLED";
  title: string;
  text: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildSessionHref(
  currentSearch: string,
  updates: Record<string, string | null> = {},
): string {
  const params = new URLSearchParams(currentSearch);
  params.set("section", "session");
  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return `/schedule?${params.toString()}`;
}

export function parseSessionFilters(search: string): SessionFilters {
  const params = new URLSearchParams(search);
  const status = params.get("status");
  return {
    status:
      status === "upcoming" || status === "passed" || status === "debts"
        ? status
        : "all",
    controlType: params.get("control") ?? "",
    query: params.get("q") ?? "",
  };
}

function dateToUtc(dateKey: string): number {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateKey
  ) {
    throw new RangeError(`Некорректная дата сессии: ${dateKey}`);
  }
  return date.getTime();
}

export function getSessionCountdown(
  dateKey: string,
  startTime: string,
  todayKey: string,
  currentTime = "00:00",
): string {
  const dayDifference = Math.round(
    (dateToUtc(dateKey) - dateToUtc(todayKey)) / DAY_MS,
  );
  if (dayDifference > 0) {
    const [hour, minute] = startTime.split(":").map(Number);
    const [currentHour, currentMinute] = currentTime.split(":").map(Number);
    const remaining =
      dayDifference * 24 * 60 +
      hour * 60 +
      minute -
      (currentHour * 60 + currentMinute);
    const days = Math.floor(remaining / (24 * 60));
    const hours = Math.floor((remaining % (24 * 60)) / 60);
    const minutes = remaining % 60;
    if (dayDifference === 1) {
      if (hours > 0) return `завтра, через ${hours} ч${minutes ? ` ${minutes} мин` : ""}`;
      return minutes > 0 ? `завтра, через ${minutes} мин` : "завтра";
    }
    return `через ${days} ${pluralDays(days)}${hours ? ` ${hours} ч` : ""}${minutes ? ` ${minutes} мин` : ""}`;
  }
  if (dayDifference === 0) return "Сегодня";
  return `дата прошла ${Math.abs(dayDifference)} ${pluralDays(Math.abs(dayDifference))} назад`;
}

function pluralDays(days: number): string {
  const lastTwo = days % 100;
  const last = days % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "дней";
  if (last === 1) return "день";
  return last >= 2 && last <= 4 ? "дня" : "дней";
}

export function summarizeSession(
  events: readonly SessionEventForUtils[],
  plannedItems = events.length,
) {
  const passedEvents = events.filter(
    (event) => event.resultStatus === "PASSED",
  );
  const numericGrades = passedEvents
    .filter((event) => event.controlType === "EXAM")
    .map((event) => event.resultValue?.replace(",", ".").trim() ?? "")
    .filter((value) => /^[2-5](?:\.\d+)?$/.test(value))
    .map(Number);
  const debts = events.filter(
    (event) => event.resultStatus === "ACADEMIC_DEBT",
  );

  return {
    passed: passedEvents.length,
    total: plannedItems,
    debts: debts.length,
    average:
      numericGrades.length > 0
        ? numericGrades.reduce((sum, grade) => sum + grade, 0) /
          numericGrades.length
        : null,
  };
}

export function getSessionStatus(
  events: readonly SessionEventForUtils[],
  todayKey: string,
  currentTime = "00:00",
  results: readonly SessionEventForUtils[] = [],
): SessionStatusSummary {
  const resultBySubject = new Map(
    results
      .filter((event) => event.resultStatus !== null)
      .map((event) => [event.subjectId ?? event.subject, event]),
  );
  const mergedEvents = events.map((event) => {
    const key = event.subjectId ?? event.subject;
    const result = resultBySubject.get(key);
    if (!result) return event;
    resultBySubject.delete(key);
    return {
      ...event,
      resultStatus: result.resultStatus,
      resultValue: result.resultValue,
      resultDate: result.resultDate,
    };
  });
  mergedEvents.push(...resultBySubject.values());
  const activeEvents = mergedEvents.filter(
    (event) => event.status !== "CANCELLED" || event.resultStatus !== null,
  );
  let started = 0;
  let upcoming = 0;
  let ongoing = 0;
  let unreported = 0;
  const debtSubjects = new Set<string>();

  for (const event of activeEvents) {
    const hasResult = event.resultStatus !== null;
    const isPast =
      event.date < todayKey ||
      (event.date === todayKey && event.endTime <= currentTime);
    const beginsToday =
      event.date === todayKey && event.startTime <= currentTime;
    const isResit =
      event.resultStatus === "ACADEMIC_DEBT" &&
      event.resultDate != null &&
      event.date > event.resultDate;
    const isUpcoming =
      (event.status === "PLANNED" || event.status === "RESCHEDULED") &&
      (event.date > todayKey ||
        (event.date === todayKey && event.startTime > currentTime)) &&
      (!hasResult || isResit);
    const isOngoing =
      event.date === todayKey &&
      event.startTime <= currentTime &&
      event.endTime > currentTime &&
      !hasResult &&
      event.status !== "COMPLETED";

    if (hasResult || event.status === "COMPLETED" || isPast || beginsToday) {
      started += 1;
    }
    if (isUpcoming) upcoming += 1;
    if (isOngoing) ongoing += 1;
    if (isPast && !hasResult && event.status !== "COMPLETED") unreported += 1;
    if (event.resultStatus === "ACADEMIC_DEBT") {
      debtSubjects.add(event.subjectId ?? event.subject);
    }
  }

  const debts = debtSubjects.size;
  const code: SessionStatusCode =
    ongoing > 0 || (started > 0 && upcoming > 0)
      ? "IN_PROGRESS"
      : started > 0
        ? "COMPLETED"
        : "NOT_STARTED";
  const label =
    code === "IN_PROGRESS"
      ? "Идёт"
      : code === "COMPLETED" && debts > 0
        ? `Завершена, есть задолженности: ${debts}`
        : code === "COMPLETED"
          ? "Завершена"
          : "Предстоит";

  return { code, label, started, upcoming, ongoing, unreported, debts };
}

export function getSessionEventStatusLabel(
  event: SessionEventForUtils,
  todayKey: string,
  currentTime: string,
): string {
  if (event.status === "CANCELLED") return "Отменено";
  if (
    event.resultStatus === "ACADEMIC_DEBT" &&
    event.resultDate != null &&
    event.date > event.resultDate &&
    (event.status === "PLANNED" || event.status === "RESCHEDULED")
  ) {
    return "Пересдача назначена";
  }
  if (event.resultStatus === "PASSED") return "Сдано";
  if (event.resultStatus === "ACADEMIC_DEBT") return "Задолженность";
  if (
    event.status === "COMPLETED" ||
    event.date < todayKey ||
    (event.date === todayKey && event.endTime <= currentTime)
  ) {
    return "Результат не внесён";
  }
  if (event.status === "RESCHEDULED") return "Перенесено";
  return "Запланировано";
}

export function filterSessionEvents<T extends SessionEventForUtils>(
  events: readonly T[],
  filters: SessionFilters,
  todayKey: string,
): T[] {
  const query = filters.query.trim().toLocaleLowerCase("ru-RU");
  return events.filter((event) => {
    const passed = event.resultStatus === "PASSED";
    const debt = event.resultStatus === "ACADEMIC_DEBT";
    const upcoming =
      (event.status === "PLANNED" || event.status === "RESCHEDULED") &&
      event.date >= todayKey &&
      (event.resultStatus === null ||
        (debt && event.resultDate != null && event.date > event.resultDate));
    if (filters.status === "passed" && !passed) return false;
    if (filters.status === "debts" && !debt) return false;
    if (filters.status === "upcoming" && !upcoming) return false;
    if (filters.controlType && event.controlType !== filters.controlType) {
      return false;
    }
    if (
      query &&
      !`${event.subject} ${event.teacher}`
        .toLocaleLowerCase("ru-RU")
        .includes(query)
    ) {
      return false;
    }
    return true;
  });
}

export function groupSessionEventsByDate<T extends SessionEventForUtils>(
  events: readonly T[],
): Array<{ date: string; events: T[] }> {
  const groups = new Map<string, T[]>();
  for (const event of [...events].sort(
    (first, second) =>
      first.date.localeCompare(second.date) ||
      first.startTime.localeCompare(second.startTime),
  )) {
    const group = groups.get(event.date) ?? [];
    group.push(event);
    groups.set(event.date, group);
  }
  return [...groups].map(([date, groupedEvents]) => ({
    date,
    events: groupedEvents,
  }));
}

export function findSessionInsights(
  events: readonly SessionEventForUtils[],
): string[] {
  const active = events
    .filter((event) => event.status !== "CANCELLED")
    .slice()
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        first.startTime.localeCompare(second.startTime),
    );
  const insights: string[] = [];
  const byDate = new Map<string, SessionEventForUtils[]>();

  for (const event of active) {
    const sameDay = byDate.get(event.date) ?? [];
    sameDay.push(event);
    byDate.set(event.date, sameDay);
  }

  for (const [date, eventsOnDate] of byDate) {
    if (eventsOnDate.filter((event) => event.controlType === "EXAM").length > 1) {
      insights.push(`Два экзамена в один день · ${date}`);
    }
    for (let first = 0; first < eventsOnDate.length; first += 1) {
      for (let second = first + 1; second < eventsOnDate.length; second += 1) {
        const earlier = eventsOnDate[first];
        const later = eventsOnDate[second];
        if (later.startTime < earlier.endTime) {
          insights.push(`Конфликт времени · ${earlier.subject} и ${later.subject}`);
        }
      }
    }
  }

  const examDates = [
    ...new Set(
      active
        .filter((event) => event.controlType === "EXAM")
        .map((event) => event.date),
    ),
  ].sort();
  for (let index = 1; index < examDates.length; index += 1) {
    const previousDate = examDates[index - 1];
    const currentDate = examDates[index];
    const daysBetween = Math.round(
      (dateToUtc(currentDate) - dateToUtc(previousDate)) / DAY_MS,
    );
    if (daysBetween === 2) {
      const previous = byDate
        .get(previousDate)
        ?.filter((event) => event.controlType === "EXAM")
        .at(-1);
      const current = byDate
        .get(currentDate)
        ?.find((event) => event.controlType === "EXAM");
      if (previous && current) {
        insights.push(
          `Между «${previous.subject}» и «${current.subject}» один день`,
        );
      }
    }
  }
  return insights;
}

export function getSessionReminderCandidates(
  events: readonly SessionEventForUtils[],
  todayKey: string,
): SessionReminder[] {
  return events.flatMap((event) => {
    if (event.status !== "PLANNED" || event.resultStatus || event.date < todayKey) {
      return [];
    }
    return ([3, 1] as const)
      .map((daysBefore) => ({
        eventId: event.id,
        daysBefore,
        date: new Date(dateToUtc(event.date) - daysBefore * DAY_MS)
          .toISOString()
          .slice(0, 10),
        title: `${event.subject}: ${daysBefore === 3 ? "через 3 дня" : "завтра"}`,
      }))
      .filter((reminder) => reminder.date === todayKey);
  });
}

export function getSessionNotificationPlan(
  event: SessionNotificationPlanInput,
): SessionNotificationPlanItem[] {
  const details = `${event.subject} · ${event.date} · ${event.startTime}–${event.endTime} · ${event.room}`;
  const notifications: SessionNotificationPlanItem[] = [];

  if (event.status === "CANCELLED") {
    notifications.push({
      kind: "CANCELLED",
      title: `Экзамен отменён: ${event.subject}`,
      text: details,
    });
    return notifications;
  }
  if (event.status === "RESCHEDULED") {
    notifications.push({
      kind: "RESCHEDULED",
      title: `Расписание экзамена изменено: ${event.subject}`,
      text: details,
    });
  }
  if (event.status !== "PLANNED" && event.status !== "RESCHEDULED") {
    return notifications;
  }

  const resit =
    event.resultStatus === "ACADEMIC_DEBT" &&
    event.resultDate !== null &&
    event.date > event.resultDate;
  if (resit && event.status === "PLANNED") {
    notifications.push({
      kind: "RESIT_ASSIGNED",
      title: `Назначена пересдача: ${event.subject}`,
      text: details,
    });
  }

  const daysUntil = Math.round(
    (dateToUtc(event.date) - dateToUtc(event.todayKey)) / DAY_MS,
  );
  if (
    daysUntil === 3 &&
    (event.resultStatus === null || resit)
  ) {
    notifications.push({
      kind: "REMINDER_3_DAYS",
      title: `${resit ? "Напоминание о пересдаче" : "Напоминание"}: ${event.subject} через 3 дня`,
      text: details,
    });
  }
  if (
    daysUntil === 1 &&
    (event.resultStatus === null || resit)
  ) {
    notifications.push({
      kind: "REMINDER_1_DAY",
      title: `${resit ? "Напоминание о пересдаче" : "Напоминание"}: ${event.subject} через 1 день`,
      text: details,
    });
  }
  return notifications;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function localDateTime(date: string, time: string): string {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

export function generateSessionIcs(
  events: readonly SessionEventForUtils[],
  generatedAt = new Date(),
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Campus OS//Session Schedule//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
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

  for (const event of events) {
    if (event.status === "CANCELLED") continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(`${event.id}@campus-os.local`)}`,
      `DTSTAMP:${generatedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART;TZID=${UNIVERSITY_TIME_ZONE}:${localDateTime(event.date, event.startTime)}`,
      `DTEND;TZID=${UNIVERSITY_TIME_ZONE}:${localDateTime(event.date, event.endTime)}`,
      `SUMMARY:${escapeIcsText(event.subject)}`,
      `DESCRIPTION:${escapeIcsText(event.controlType)}`,
      `LOCATION:${escapeIcsText(event.room ?? "")}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(`Завтра: ${event.subject}`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

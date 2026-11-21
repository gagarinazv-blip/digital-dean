import { describe, expect, it } from "vitest";
import type { StudentNotificationItem } from "../src/lib/notification-types";
import {
  createNotificationUrl,
  filterNotifications,
  groupNotificationsByDate,
  parseNotificationFilter,
  parseNotificationTypeFilter,
} from "../src/lib/notification-view-utils";

const now = new Date("2026-11-20T12:00:00.000Z");

function notification(
  publicId: string,
  createdAt: string,
  values: Partial<StudentNotificationItem> = {},
): StudentNotificationItem {
  return {
    publicId,
    type: "REQUEST_STATUS",
    title: "Заявка обновлена",
    text: "Статус изменён",
    targetType: "REQUEST",
    targetId: publicId,
    href: `/requests/${publicId}`,
    createdAt,
    readAt: null,
    source: "Заявка",
    context: "Заявление · В работе",
    targetAvailable: true,
    details: {},
    ...values,
  };
}

describe("notification view utilities", () => {
  it("parses URL filters and preserves unrelated query parameters", () => {
    expect(parseNotificationFilter("unread")).toBe("unread");
    expect(parseNotificationFilter("invalid")).toBe("all");
    expect(parseNotificationTypeFilter("request")).toBe("request");
    expect(parseNotificationTypeFilter("invalid")).toBeNull();
    expect(
      createNotificationUrl(
        new URLSearchParams("filter=unread&type=request&open=abc"),
        { type: null, q: "расписание" },
      ),
    ).toBe("/notifications?filter=unread&open=abc&q=%D1%80%D0%B0%D1%81%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5");
  });

  it("filters unread items by type and free-text context", () => {
    const items = [
      notification("request-1", "2026-11-20T09:00:00.000Z"),
      notification("schedule-1", "2026-11-19T09:00:00.000Z", {
        type: "SCHEDULE_CHANGE",
        title: "Изменение аудитории",
        context: "История · ауд. 101",
        readAt: "2026-11-19T10:00:00.000Z",
      }),
    ];

    expect(filterNotifications(items, "unread", null, "")).toEqual([items[0]]);
    expect(filterNotifications(items, "all", "schedule", "101")).toEqual([
      items[1],
    ]);
  });

  it("groups Moscow-local today, yesterday, current-week and older dates", () => {
    const items = [
      notification("today", "2026-11-20T00:00:00.000Z"),
      notification("yesterday", "2026-11-19T00:00:00.000Z"),
      notification("week", "2026-11-17T00:00:00.000Z"),
      notification("earlier", "2026-11-15T00:00:00.000Z"),
    ];

    expect(
      groupNotificationsByDate(items, now).map(({ key, notifications }) => [
        key,
        notifications[0]?.publicId,
      ]),
    ).toEqual([
      ["today", "today"],
      ["yesterday", "yesterday"],
      ["week", "week"],
      ["earlier", "earlier"],
    ]);
  });
});

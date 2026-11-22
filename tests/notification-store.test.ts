import { describe, expect, it, vi } from "vitest";
import { createNotificationStore } from "../src/lib/notification-store";
import type { NotificationFeedPage } from "../src/lib/notification-types";

const publicId = "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1";

const item = {
  publicId,
  type: "REQUEST_STATUS" as const,
  title: "Обновлён статус заявки",
  text: "В работе",
  targetType: "REQUEST" as const,
  targetId: publicId,
  href: `/requests/${publicId}`,
  createdAt: "2026-11-20T09:00:00.000Z",
  readAt: null,
  source: "Заявка",
  context: "Справка · В работе",
  targetAvailable: true,
  details: {},
};

const page: NotificationFeedPage = {
  notifications: [item],
  unreadCount: 1,
  typeCounts: {
    SCHEDULE_CHANGE: 0,
    DEADLINE: 0,
    REQUEST_STATUS: 1,
    ANNOUNCEMENT: 0,
    OPPORTUNITY_STATUS: 0,
  },
  hasMore: false,
  nextCursor: null,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("shared notification store", () => {
  it("shares the feed and unread count between subscribers", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(page));
    const store = createNotificationStore(fetcher);

    expect(await store.refresh()).toBe(true);
    expect(store.getSnapshot().notifications).toEqual([item]);
    expect(store.getSnapshot().unreadCount).toBe(1);
    expect(store.getSnapshot().unreadCount).toBe(
      store
        .getSnapshot()
        .notifications.filter((notification) => notification.readAt === null)
        .length,
    );

    fetcher.mockResolvedValueOnce(jsonResponse({ unreadCount: 0 }));
    expect(await store.markRead(publicId)).toBe(true);
    expect(store.getSnapshot().notifications[0]?.readAt).not.toBeNull();
    expect(store.getSnapshot().unreadCount).toBe(0);
    expect(store.getSnapshot().unreadCount).toBe(
      store
        .getSnapshot()
        .notifications.filter((notification) => notification.readAt === null)
        .length,
    );
  });

  it("rolls back optimistic status when the server rejects an action", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(page))
      .mockResolvedValueOnce(jsonResponse({ error: "Недоступно." }, 500));
    const store = createNotificationStore(fetcher);
    await store.refresh();

    expect(await store.markRead(publicId)).toBe(false);
    expect(store.getSnapshot().notifications[0]?.readAt).toBeNull();
    expect(store.getSnapshot().unreadCount).toBe(1);
    expect(store.getSnapshot().error).toBe("Недоступно.");
  });

  it("marks every notification read after the server confirms the action", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(page))
      .mockResolvedValueOnce(jsonResponse({ unreadCount: 0 }));
    const store = createNotificationStore(fetcher);
    await store.refresh();

    expect(await store.markAllRead()).toBe(true);
    expect(store.getSnapshot().notifications[0]?.readAt).not.toBeNull();
    expect(store.getSnapshot().unreadCount).toBe(0);
  });
});

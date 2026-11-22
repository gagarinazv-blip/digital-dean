"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { NotificationType } from "@/generated/prisma/enums";
import type {
  NotificationFeedPage,
  NotificationReadActionResult,
  NotificationTypeCounts,
  StudentNotificationItem,
} from "@/lib/notification-types";

const POLL_INTERVAL_MS = 45_000;
const PAGE_SIZE = 20;
const notificationTypes: NotificationType[] = [
  "SCHEDULE_CHANGE",
  "DEADLINE",
  "REQUEST_STATUS",
  "ANNOUNCEMENT",
  "OPPORTUNITY_STATUS",
];

export type NotificationStoreSnapshot = NotificationFeedPage & {
  loading: boolean;
  actionPending: boolean;
  error: string | null;
  message: string | null;
  loaded: boolean;
};

function emptyTypeCounts(): NotificationTypeCounts {
  return {
    SCHEDULE_CHANGE: 0,
    DEADLINE: 0,
    REQUEST_STATUS: 0,
    ANNOUNCEMENT: 0,
    OPPORTUNITY_STATUS: 0,
  };
}

function makeInitialSnapshot(): NotificationStoreSnapshot {
  return {
    notifications: [],
    unreadCount: 0,
    typeCounts: emptyTypeCounts(),
    hasMore: false,
    nextCursor: null,
    loading: false,
    actionPending: false,
    error: null,
    message: null,
    loaded: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotification(value: unknown): value is StudentNotificationItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.publicId === "string" &&
    notificationTypes.includes(value.type as NotificationType) &&
    typeof value.title === "string" &&
    typeof value.text === "string" &&
    (value.href === null || typeof value.href === "string") &&
    typeof value.createdAt === "string" &&
    (value.readAt === null || typeof value.readAt === "string") &&
    typeof value.source === "string" &&
    typeof value.context === "string" &&
    isRecord(value.details)
  );
}

function isFeedPage(value: unknown): value is NotificationFeedPage {
  if (!isRecord(value) || !Array.isArray(value.notifications)) return false;
  if (!value.notifications.every(isNotification)) return false;
  if (
    typeof value.unreadCount !== "number" ||
    !Number.isSafeInteger(value.unreadCount) ||
    value.unreadCount < 0 ||
    typeof value.hasMore !== "boolean" ||
    !(
      value.nextCursor === null ||
      typeof value.nextCursor === "string"
    )
  ) {
    return false;
  }
  if (!isRecord(value.typeCounts)) return false;
  const typeCounts = value.typeCounts;
  return notificationTypes.every(
    (type) =>
      typeof typeCounts[type] === "number" &&
      Number.isSafeInteger(typeCounts[type]) &&
      (typeCounts[type] as number) >= 0,
  );
}

function isReadActionResult(
  value: unknown,
): value is NotificationReadActionResult {
  return (
    isRecord(value) &&
    typeof value.unreadCount === "number" &&
    Number.isSafeInteger(value.unreadCount) &&
    value.unreadCount >= 0
  );
}

async function getResponseError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const failure: unknown = await response.json().catch(() => null);
  const message =
    isRecord(failure) && typeof failure.error === "string"
      ? failure.error
      : fallback;
  return new Error(message);
}

export function createNotificationStore(
  fetcher: typeof fetch = fetch,
  initialCount = 0,
) {
  let snapshot = { ...makeInitialSnapshot(), unreadCount: initialCount };
  const listeners = new Set<() => void>();
  let pollTimer: number | null = null;
  let loadPromise: Promise<boolean> | null = null;
  let initialUnreadCount: number | null = initialCount;

  const emit = () => listeners.forEach((listener) => listener());
  const setSnapshot = (update: Partial<NotificationStoreSnapshot>) => {
    snapshot = { ...snapshot, ...update };
    emit();
  };

  async function loadPage(cursor?: string): Promise<boolean> {
    if (loadPromise) return loadPromise;
    if (snapshot.loading) return false;
    setSnapshot({ loading: true, error: null });
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    loadPromise = (async () => {
      try {
        const response = await fetcher(
          `/api/student-notifications?${query.toString()}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw await getResponseError(
            response,
            "Не удалось загрузить уведомления.",
          );
        }
        const data: unknown = await response.json();
        if (!isFeedPage(data)) {
          throw new Error("Получен некорректный список уведомлений.");
        }
        let notifications = cursor
          ? [
              ...snapshot.notifications,
              ...data.notifications.filter(
                (item) =>
                  !snapshot.notifications.some(
                    (existing) => existing.publicId === item.publicId,
                  ),
              ),
            ]
          : mergeNewNotifications(snapshot.notifications, data.notifications);
        const unreadCount = data.unreadCount;
        if (snapshot.actionPending) {
          const currentById = new Map(
            snapshot.notifications.map((item) => [item.publicId, item]),
          );
          notifications = notifications.map((item) => {
            const current = currentById.get(item.publicId);
            return current ? { ...item, readAt: current.readAt } : item;
          });
        }
        setSnapshot({
          notifications,
          unreadCount: snapshot.actionPending
            ? snapshot.unreadCount
            : unreadCount,
          typeCounts: data.typeCounts,
          hasMore: data.hasMore,
          nextCursor: data.nextCursor,
          loading: false,
          error: null,
          loaded: true,
        });
        return true;
      } catch (error) {
        setSnapshot({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Не удалось загрузить уведомления.",
        });
        return false;
      } finally {
        loadPromise = null;
      }
    })();
    return loadPromise;
  }

  function mergeNewNotifications(
    existing: StudentNotificationItem[],
    fresh: StudentNotificationItem[],
  ): StudentNotificationItem[] {
    const freshIds = new Set(fresh.map((item) => item.publicId));
    const olderItems = existing.filter((item) => !freshIds.has(item.publicId));
    return [...fresh, ...olderItems];
  }

  async function refresh(): Promise<boolean> {
    return loadPage();
  }

  async function loadMore(): Promise<boolean> {
    if (!snapshot.hasMore || !snapshot.nextCursor) return false;
    return loadPage(snapshot.nextCursor);
  }

  async function loadNotification(publicId: string): Promise<boolean> {
    try {
      const response = await fetcher(
        `/api/student-notifications?publicId=${encodeURIComponent(publicId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw await getResponseError(response, "Уведомление недоступно.");
      }
      const data: unknown = await response.json();
      if (!isRecord(data) || !isNotification(data.notification)) {
        throw new Error("Получено некорректное уведомление.");
      }
      const item = data.notification;
      setSnapshot({
        notifications: snapshot.notifications.some(
          (existing) => existing.publicId === item.publicId,
        )
          ? snapshot.notifications.map((existing) =>
              existing.publicId === item.publicId ? item : existing,
            )
          : [item, ...snapshot.notifications],
        error: null,
      });
      return true;
    } catch (error) {
      setSnapshot({
        error:
          error instanceof Error ? error.message : "Уведомление недоступно.",
      });
      return false;
    }
  }

  async function mutateRead(
    payload: Record<string, unknown>,
    publicIds: string[] | null,
    shouldRead: boolean,
  ): Promise<boolean> {
    if (snapshot.actionPending) return false;
    const previous = snapshot;
    const readAt = shouldRead ? new Date().toISOString() : null;
    const affectedIds = publicIds
      ? new Set(publicIds)
      : new Set(snapshot.notifications.map((item) => item.publicId));
    const changedUnread = previous.notifications.filter(
      (item) =>
        affectedIds.has(item.publicId) &&
        (shouldRead ? item.readAt === null : item.readAt !== null),
    ).length;
    const optimisticUnreadCount =
      previous.unreadCount + (shouldRead ? -changedUnread : changedUnread);
    setSnapshot({
      actionPending: true,
      error: null,
      message: null,
      unreadCount: payload.all === true
        ? 0
        : Math.max(0, optimisticUnreadCount),
      notifications: previous.notifications.map((item) =>
        affectedIds.has(item.publicId) ? { ...item, readAt } : item,
      ),
    });

    try {
      const response = await fetcher("/api/student-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw await getResponseError(
          response,
          "Не удалось обновить уведомления.",
        );
      }
      const data: unknown = await response.json();
      if (!isReadActionResult(data)) {
        throw new Error("Получен некорректный ответ от сервера.");
      }
      setSnapshot({
        actionPending: false,
        unreadCount: data.unreadCount,
        message:
          payload.all === true
            ? "Готово. Всё прочитано."
            : shouldRead
              ? "Отмечено прочитанным"
              : "Отмечено непрочитанным",
      });
      return true;
    } catch (error) {
      const current = snapshot;
      const previousById = new Map(
        previous.notifications.map((item) => [item.publicId, item]),
      );
      setSnapshot({
        ...current,
        notifications: current.notifications.map((item) => {
          if (!affectedIds.has(item.publicId)) return item;
          const previousItem = previousById.get(item.publicId);
          return previousItem ? { ...item, readAt: previousItem.readAt } : item;
        }),
        unreadCount: previous.unreadCount,
        actionPending: false,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось обновить уведомления.",
      });
      return false;
    }
  }

  function markRead(publicId: string): Promise<boolean> {
    const item = snapshot.notifications.find(
      (notification) => notification.publicId === publicId,
    );
    if (item && item.readAt !== null) return Promise.resolve(true);
    return mutateRead({ publicId, read: true }, [publicId], true);
  }

  function markUnread(publicId: string): Promise<boolean> {
    const item = snapshot.notifications.find(
      (notification) => notification.publicId === publicId,
    );
    if (item && item.readAt === null) return Promise.resolve(true);
    return mutateRead({ publicId, read: false }, [publicId], false);
  }

  function markAllRead(): Promise<boolean> {
    return mutateRead({ all: true }, null, true);
  }

  function markManyRead(publicIds: string[]): Promise<boolean> {
    if (publicIds.length === 0) return Promise.resolve(true);
    return mutateRead({ publicIds, read: true }, publicIds, true);
  }

  function setInitialCount(count: number) {
    if (
      !snapshot.loaded &&
      Number.isSafeInteger(count) &&
      count >= 0 &&
      initialUnreadCount !== count
    ) {
      initialUnreadCount = count;
      setSnapshot({ unreadCount: count });
    }
  }

  function startPolling() {
    if (typeof window === "undefined" || pollTimer !== null) return;
    void refresh();
    pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      if (pollTimer !== null) window.clearInterval(pollTimer);
      pollTimer = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }

  let stopPolling: (() => void) | null = null;
  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!stopPolling) stopPolling = startPolling() ?? null;
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        stopPolling?.();
        stopPolling = null;
      }
    };
  }

  function resetForTests() {
    stopPolling?.();
    stopPolling = null;
    snapshot = makeInitialSnapshot();
    initialUnreadCount = null;
    emit();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe,
    refresh,
    loadMore,
    loadNotification,
    markRead,
    markUnread,
    markAllRead,
    markManyRead,
    setInitialCount,
    resetForTests,
  };
}

const notificationStores = new Map<number, ReturnType<typeof createNotificationStore>>();

function getStudentStore(studentId: number, initialCount: number) {
  let store = notificationStores.get(studentId);
  if (!store) {
    store = createNotificationStore(fetch, initialCount);
    notificationStores.set(studentId, store);
  }
  return store;
}

export function useStudentNotificationStore(
  studentId: number,
  initialUnreadCount?: number,
) {
  const store = getStudentStore(studentId, initialUnreadCount ?? 0);
  const serverSnapshot = useMemo(
    () => ({ ...makeInitialSnapshot(), unreadCount: initialUnreadCount ?? 0 }),
    [initialUnreadCount],
  );
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => serverSnapshot,
  );
  useEffect(() => {
    if (initialUnreadCount !== undefined) {
      store.setInitialCount(initialUnreadCount);
    }
  }, [initialUnreadCount, store]);
  return { ...state, ...store };
}

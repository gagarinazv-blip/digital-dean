"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildNotificationTargetHref } from "@/lib/notification-workflow";
import { notificationTypeLabels } from "@/lib/notification-workflow";
import { cleanStudentFacingText } from "@/lib/campus-labels";
import type {
  NotificationTargetType,
  NotificationType,
} from "@/generated/prisma/enums";
import styles from "./notification-bell.module.css";

type BellNotification = {
  publicId: string;
  type: NotificationType | null;
  title: string;
  text: string;
  targetType: NotificationTargetType | null;
  targetId: string | null;
  createdAt: string;
  readAt: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

const unreadCountEvent = "campus:unread-notification-count";

export function NotificationBell({
  initialUnreadCount,
}: {
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [mutationPending, setMutationPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const mutationPendingRef = useRef(false);

  function updateUnreadCount(count: number) {
    setUnreadCount(count);
    window.dispatchEvent(new CustomEvent(unreadCountEvent, { detail: count }));
  }

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => popoverRef.current?.focus());
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student-notifications", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Не удалось загрузить уведомления.");
      const data = (await response.json()) as {
        notifications: BellNotification[];
        unreadCount: number;
      };
      if (
        !Array.isArray(data.notifications) ||
        !Number.isSafeInteger(data.unreadCount) ||
        data.unreadCount < 0
      ) {
        throw new Error("Некорректный список уведомлений.");
      }
      setNotifications(data.notifications);
      updateUnreadCount(data.unreadCount);
    } catch {
      setError("Не удалось загрузить уведомления.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePanel() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    await loadNotifications();
  }

  async function markOneRead(notification: BellNotification): Promise<boolean> {
    if (notification.readAt !== null) return true;
    if (mutationPendingRef.current) return false;
    mutationPendingRef.current = true;
    setMutationPending(true);
    setError("");

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setNotifications((current) =>
      current.map((item) =>
        item.publicId === notification.publicId
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
    );
    updateUnreadCount(Math.max(0, previousUnreadCount - 1));

    try {
      const response = await fetch("/api/student-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: notification.publicId }),
      });
      if (!response.ok) throw new Error("Не удалось обновить уведомление.");
      const data = (await response.json()) as { unreadCount: unknown };
      if (
        typeof data.unreadCount !== "number" ||
        !Number.isSafeInteger(data.unreadCount) ||
        data.unreadCount < 0
      ) {
        throw new Error("Некорректный счётчик уведомлений.");
      }
      updateUnreadCount(data.unreadCount);
      return true;
    } catch {
      setNotifications(previousNotifications);
      updateUnreadCount(previousUnreadCount);
      setError("Не удалось отметить уведомление прочитанным.");
      return false;
    } finally {
      mutationPendingRef.current = false;
      setMutationPending(false);
    }
  }

  async function markAllRead() {
    if (mutationPendingRef.current) return;
    mutationPendingRef.current = true;
    setMutationPending(true);
    setError("");

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );
    updateUnreadCount(0);

    try {
      const response = await fetch("/api/student-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Не удалось обновить уведомления.");
      const data = (await response.json()) as { unreadCount: unknown };
      if (
        typeof data.unreadCount !== "number" ||
        !Number.isSafeInteger(data.unreadCount) ||
        data.unreadCount < 0
      ) {
        throw new Error("Некорректный счётчик уведомлений.");
      }
      updateUnreadCount(data.unreadCount);
      router.refresh();
    } catch {
      setNotifications(previousNotifications);
      updateUnreadCount(previousUnreadCount);
      setError("Не удалось отметить уведомления прочитанными.");
    } finally {
      mutationPendingRef.current = false;
      setMutationPending(false);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        aria-controls="notification-popover"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `Уведомления, непрочитанных: ${unreadCount}`
            : "Уведомления"
        }
        className={styles.trigger}
        onClick={togglePanel}
        ref={triggerRef}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span aria-hidden="true" className={styles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          aria-label="Последние уведомления"
          aria-modal="false"
          className={styles.popover}
          id="notification-popover"
          role="dialog"
          ref={popoverRef}
          tabIndex={-1}
        >
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Новые события</p>
              <h2>Уведомления</h2>
            </div>
            {unreadCount > 0 && (
              <button
                className={styles.markAll}
                disabled={mutationPending}
                onClick={markAllRead}
                type="button"
              >
                Прочитать все
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.loading} aria-label="Загрузка уведомлений">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <>
              {error && (
                <div className={styles.empty} role="alert">
                  <strong>Не удалось выполнить действие</strong>
                  <p>{error}</p>
                </div>
              )}
              {notifications.length === 0 ? (
                !error && (
                  <div className={styles.empty}>
                    <strong>Уведомлений пока нет</strong>
                    <p>Здесь появятся изменения по учёбе и заявкам.</p>
                  </div>
                )
              ) : (
                <ul className={styles.list}>
                  {notifications.slice(0, 5).map((notification) => {
                    const href =
                      notification.type &&
                      notification.targetType &&
                      notification.targetId
                        ? buildNotificationTargetHref(
                            notification.type,
                            notification.targetType,
                            notification.targetId,
                          )
                        : null;
                    const content = (
                      <>
                        <span className={styles.itemText}>
                          <span className={styles.type}>
                            {notification.type
                              ? notificationTypeLabels[notification.type]
                              : "Уведомление"}
                          </span>
                          <strong>{cleanStudentFacingText(notification.title)}</strong>
                          <time dateTime={notification.createdAt}>
                            {dateFormatter.format(
                              new Date(notification.createdAt),
                            )}
                          </time>
                        </span>
                        {notification.readAt === null && (
                          <span
                            aria-label="Непрочитано"
                            className={styles.unread}
                          />
                        )}
                      </>
                    );
                    return (
                      <li
                        className={`${styles.item} ${
                          notification.readAt === null
                            ? styles.itemUnread
                            : ""
                        }`}
                        key={notification.publicId}
                      >
                        {href ? (
                          <Link
                            aria-disabled={mutationPending}
                            className={styles.itemLink}
                            href={href}
                            onClick={(event) => {
                              event.preventDefault();
                              void markOneRead(notification).then((success) => {
                                if (success) {
                                  router.push(href);
                                }
                              });
                            }}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            className={styles.itemLink}
                            disabled={mutationPending}
                            onClick={() => {
                              void markOneRead(notification).then((success) => {
                                if (success) router.refresh();
                              });
                            }}
                            type="button"
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
          <Link
            className={styles.allLink}
            href="/notifications"
            onClick={() => setOpen(false)}
          >
            Все уведомления
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

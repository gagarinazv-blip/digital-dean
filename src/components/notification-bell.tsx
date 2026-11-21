"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildNotificationTargetHref } from "@/lib/notification-workflow";
import { notificationTypeLabels } from "@/lib/notification-workflow";
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

export function NotificationBell({
  initialUnreadCount,
}: {
  initialUnreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
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

  async function markOneRead(notification: BellNotification) {
    if (notification.readAt !== null) return;
    await fetch("/api/student-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: notification.publicId }),
    });
    setNotifications((current) =>
      current.map((item) =>
        item.publicId === notification.publicId
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function markAllRead() {
    await fetch("/api/student-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
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
          ) : error ? (
            <div className={styles.empty} role="alert">
              <strong>Список недоступен</strong>
              <p>{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>
              <strong>Уведомлений пока нет</strong>
              <p>Здесь появятся изменения по учёбе и заявкам.</p>
            </div>
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
                      <strong>{notification.title}</strong>
                      <time dateTime={notification.createdAt}>
                        {dateFormatter.format(new Date(notification.createdAt))}
                      </time>
                    </span>
                    {notification.readAt === null && (
                      <span aria-label="Непрочитано" className={styles.unread} />
                    )}
                  </>
                );
                return (
                  <li
                    className={`${styles.item} ${
                      notification.readAt === null ? styles.itemUnread : ""
                    }`}
                    key={notification.publicId}
                  >
                    {href ? (
                      <Link
                        className={styles.itemLink}
                        href={href}
                        onClick={() => void markOneRead(notification)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        className={styles.itemLink}
                        onClick={() => void markOneRead(notification)}
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

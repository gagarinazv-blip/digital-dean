"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "iconoir-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NotificationSymbol } from "@/components/notification-symbol";
import { cleanStudentFacingText } from "@/lib/campus-labels";
import { getUniversityDateTimeFormatter } from "@/lib/campus-time";
import { useStudentNotificationStore } from "@/lib/notification-store";
import { notificationTypeLabels } from "@/lib/notification-workflow";
import styles from "./notification-bell.module.css";

const dateFormatter = getUniversityDateTimeFormatter({
  day: "numeric",
  month: "short",
});

function relativeTime(value: string): string {
  const difference = Math.max(0, Date.now() - new Date(value).getTime());
  if (difference < 60_000) return "только что";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)} мин`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)} ч`;
  if (difference < 172_800_000) return "вчера";
  return dateFormatter.format(new Date(value));
}

export function NotificationBell({
  initialUnreadCount,
  studentId,
}: {
  initialUnreadCount: number;
  studentId: number;
}) {
  const router = useRouter();
  const state = useStudentNotificationStore(studentId, initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const previousFirstIdRef = useRef<string | null>(null);
  const previousScrollHeightRef = useRef(0);

  const notifications = useMemo(
    () =>
      state.notifications
        .filter(
          (notification) =>
            activeFilter === "all" || notification.readAt === null,
        )
        .slice(0, 8),
    [activeFilter, state.notifications],
  );

  useLayoutEffect(() => {
    const list = listRef.current;
    const previousFirstId = previousFirstIdRef.current;
    const firstId = notifications[0]?.publicId ?? null;
    if (
      list &&
      previousFirstId &&
      firstId !== previousFirstId &&
      notifications.some((item) => item.publicId === previousFirstId) &&
      list.scrollTop > 0
    ) {
      const heightDelta = list.scrollHeight - previousScrollHeightRef.current;
      if (heightDelta > 0) list.scrollTop += heightDelta;
    }
    previousFirstIdRef.current = firstId;
    if (list) previousScrollHeightRef.current = list.scrollHeight;
  }, [notifications]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => popoverRef.current?.focus());
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  async function openNotification(publicId: string, href: string | null) {
    const success = await state.markRead(publicId);
    if (!success) return;
    setOpen(false);
    router.push(href ?? `/notifications?open=${encodeURIComponent(publicId)}`);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        aria-controls="notification-popover"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Уведомления, непрочитанных: ${state.unreadCount}`}
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <Bell
          aria-hidden="true"
          strokeWidth={1.8}
        />
        {state.unreadCount > 0 && (
          <span aria-hidden="true" className={styles.badge}>
            {state.unreadCount > 9 ? "9+" : state.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          aria-labelledby="notification-popover-title"
          className={styles.popover}
          id="notification-popover"
          ref={popoverRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Важное об учёбе</p>
              <h2 id="notification-popover-title">Уведомления</h2>
            </div>
            {state.unreadCount > 0 && (
              <button
                className={styles.markAll}
                disabled={state.actionPending}
                onClick={() => void state.markAllRead()}
                type="button"
              >
                Прочитать все
              </button>
            )}
          </div>

          <div aria-label="Фильтр уведомлений" className={styles.tabs} role="tablist">
            {(["all", "unread"] as const).map((filter) => (
              <button
                aria-selected={activeFilter === filter}
                className={activeFilter === filter ? styles.tabActive : ""}
                key={filter}
                onClick={() => setActiveFilter(filter)}
                role="tab"
                type="button"
              >
                {filter === "all" ? "Все" : "Непрочитанные"}
              </button>
            ))}
          </div>

          {state.loading && state.notifications.length === 0 ? (
            <div aria-label="Загрузка уведомлений" className={styles.loading}>
              <span />
              <span />
              <span />
            </div>
          ) : state.error && state.notifications.length === 0 ? (
            <div className={styles.empty} role="alert">
              <strong>Не удалось загрузить</strong>
              <p>{state.error}</p>
              <button onClick={() => void state.refresh()} type="button">
                Повторить
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>
              <span aria-hidden="true" className={styles.emptyIcon}>✓</span>
              <strong>
                {activeFilter === "unread"
                  ? "Новых уведомлений нет"
                  : "Уведомлений пока нет"}
              </strong>
              <p>Здесь появятся изменения по учёбе и заявкам.</p>
            </div>
          ) : (
            <ul
              aria-label="Последние уведомления"
              className={styles.list}
              ref={listRef}
              role="list"
            >
              {notifications.map((notification) => (
                <li
                  className={`${styles.item} ${
                    notification.readAt === null ? styles.itemUnread : ""
                  }`}
                  key={notification.publicId}
                >
                  <button
                    className={styles.itemLink}
                    disabled={state.actionPending}
                    onClick={() =>
                      void openNotification(
                        notification.publicId,
                        notification.targetAvailable === false
                          ? null
                          : notification.href,
                      )
                    }
                    type="button"
                  >
                    <NotificationSymbol type={notification.type} />
                    <span className={styles.itemText}>
                      <span className={styles.type}>
                        {notificationTypeLabels[notification.type]}
                      </span>
                      <strong title={cleanStudentFacingText(notification.title)}>
                        {cleanStudentFacingText(notification.title)}
                      </strong>
                      <span className={styles.context} title={notification.context}>
                        {notification.context}
                      </span>
                      <time dateTime={notification.createdAt}>
                        {relativeTime(notification.createdAt)}
                      </time>
                    </span>
                    {notification.readAt === null && (
                      <span aria-label="Непрочитано" className={styles.unread} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {state.error && state.notifications.length > 0 && (
            <p className={styles.inlineError} role="alert">{state.error}</p>
          )}
          <p aria-live="polite" className={styles.liveMessage}>
            {state.message}
          </p>
          <Link
            className={styles.allLink}
            href="/notifications"
            onClick={() => setOpen(false)}
          >
            Все уведомления <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

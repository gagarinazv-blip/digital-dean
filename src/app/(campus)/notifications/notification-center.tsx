"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { NotificationSymbol } from "@/components/notification-symbol";
import { EmptyState } from "@/components/empty-state";
import { cleanStudentFacingText } from "@/lib/campus-labels";
import { useStudentNotificationStore } from "@/lib/notification-store";
import type { StudentNotificationItem } from "@/lib/notification-types";
import {
  createNotificationUrl,
  filterNotifications,
  groupNotificationsByDate,
  parseNotificationFilter,
  parseNotificationTypeFilter,
  toNotificationType,
  type NotificationTypeFilter,
} from "@/lib/notification-view-utils";
import { notificationTypeLabels } from "@/lib/notification-workflow";
import { getUniversityDateTimeFormatter } from "@/lib/campus-time";
import styles from "./notifications.module.css";

const typeFilters: Array<{
  value: NotificationTypeFilter;
  label: string;
}> = [
  { value: "schedule", label: "Расписание" },
  { value: "deadline", label: "Дедлайны" },
  { value: "request", label: "Заявки" },
  { value: "announcement", label: "Объявления" },
  { value: "opportunity", label: "Возможности" },
];

const dateFormatter = getUniversityDateTimeFormatter({
  dateStyle: "long",
  timeStyle: "short",
});

function getTargetLabel(notification: StudentNotificationItem): string {
  switch (notification.targetType) {
    case "SCHEDULE_ITEM":
      return "Перейти к занятию";
    case "ACADEMIC_SESSION":
      return "Открыть экзамен";
    case "DEADLINE":
      return "Перейти к заданию";
    case "REQUEST":
      return "Открыть заявку";
    default:
      return "Открыть объявление";
  }
}

function NotificationRow({
  notification,
  selected,
  checked,
  actionPending,
  onSelect,
  onToggleRead,
  onToggleChecked,
}: {
  notification: StudentNotificationItem;
  selected: boolean;
  checked: boolean;
  actionPending: boolean;
  onSelect: () => void;
  onToggleRead: () => void;
  onToggleChecked: () => void;
}) {
  const unread = notification.readAt === null;
  const menuRef = useRef<HTMLDetailsElement>(null);
  return (
    <article
      aria-current={selected ? "true" : undefined}
      className={`${styles.notificationRow} ${
        unread ? styles.notificationUnread : ""
      } ${selected ? styles.notificationSelected : ""}`}
      data-notification-id={notification.publicId}
      role="listitem"
    >
      <label className={styles.selectControl}>
        <input
          aria-label={`Выбрать: ${cleanStudentFacingText(notification.title)}`}
          checked={checked}
          onChange={onToggleChecked}
          type="checkbox"
        />
      </label>
      <button className={styles.rowMain} onClick={onSelect} type="button">
        <NotificationSymbol type={notification.type} />
        <span className={styles.rowContent}>
          <span className={styles.rowType}>
            {notificationTypeLabels[notification.type]}
          </span>
          <strong title={cleanStudentFacingText(notification.title)}>
            {cleanStudentFacingText(notification.title)}
          </strong>
          <span className={styles.rowContext} title={notification.context}>
            {notification.context}
          </span>
          <time dateTime={notification.createdAt}>
            {dateFormatter.format(new Date(notification.createdAt))}
          </time>
        </span>
      </button>
      <span
        className={`${styles.readStatus} ${
          unread ? styles.unreadStatus : ""
        }`}
      >
        {unread ? "Непрочитано" : "Прочитано"}
      </span>
      <details className={styles.rowMenu} ref={menuRef}>
        <summary
          aria-label={`Действия: ${cleanStudentFacingText(notification.title)}`}
          className={styles.rowMenuTrigger}
        >
          ⋯
        </summary>
        <div className={styles.rowMenuItems} role="menu">
          <button
            disabled={actionPending}
            onClick={() => {
              if (menuRef.current) menuRef.current.open = false;
              onToggleRead();
            }}
            role="menuitem"
            type="button"
          >
            {unread ? "Отметить прочитанным" : "Отметить непрочитанным"}
          </button>
        </div>
      </details>
    </article>
  );
}

function NotificationDetails({
  notification,
  onToggleRead,
  onOpenTarget,
  actionPending,
  idSuffix,
}: {
  notification: StudentNotificationItem;
  onToggleRead: () => void;
  onOpenTarget: (href: string) => void;
  actionPending: boolean;
  idSuffix: string;
}) {
  const schedule = notification.details.schedule;
  const deadline = notification.details.deadline;
  const request = notification.details.request;
  const isTargetUnavailable = notification.targetAvailable === false;
  const href = notification.href;

  return (
    <aside
      aria-labelledby={`selected-notification-title-${idSuffix}`}
      className={styles.detailPanel}
      id={`notification-detail-${idSuffix}-${notification.publicId}`}
    >
      <p className={styles.detailEyebrow}>{notification.source}</p>
      <h2 id={`selected-notification-title-${idSuffix}`}>
        {cleanStudentFacingText(notification.title)}
      </h2>
      <time dateTime={notification.createdAt}>
        {dateFormatter.format(new Date(notification.createdAt))}
      </time>
      <p className={styles.detailText}>
        {cleanStudentFacingText(notification.text)}
      </p>

      {schedule && (
        <section
          className={styles.changeDetails}
          aria-labelledby={`schedule-change-title-${idSuffix}`}
        >
          <h3 id={`schedule-change-title-${idSuffix}`}>Что изменилось</h3>
          <dl>
            {(schedule.previousDateLabel ||
              schedule.previousTimeLabel ||
              schedule.previousRoom) && (
              <div>
                <dt>Было</dt>
                <dd>
                  {[schedule.previousDateLabel, schedule.previousTimeLabel, schedule.previousRoom]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
            )}
            <div>
              <dt>Стало</dt>
              <dd>
                {[schedule.dateLabel, schedule.timeLabel, schedule.room]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
          </dl>
          {schedule.changeNote && <p>{cleanStudentFacingText(schedule.changeNote)}</p>}
        </section>
      )}

      {request && (
        <div className={styles.statusDetails}>
          <span>Заявка {request.requestNumber}</span>
          <strong>{request.statusLabel}</strong>
        </div>
      )}

      {deadline && (
        <div className={styles.statusDetails}>
          <span>Срок задания</span>
          <strong>{dateFormatter.format(new Date(deadline.dueAt))}</strong>
          {deadline.remainingLabel && <span>{deadline.remainingLabel}</span>}
          <span>{deadline.statusLabel}</span>
        </div>
      )}

      {isTargetUnavailable ? (
        <p className={styles.unavailable} role="status">
          Недоступно. Текст уведомления сохранён.
        </p>
      ) : href ? (
        <Link
          className={styles.primaryButton}
          href={href}
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            event.preventDefault();
            onOpenTarget(href);
          }}
        >
          {getTargetLabel(notification)}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
      <button
        className={styles.secondaryButton}
        disabled={actionPending}
        onClick={onToggleRead}
        type="button"
      >
        {notification.readAt === null
          ? "Отметить прочитанным"
          : "Отметить непрочитанным"}
      </button>
    </aside>
  );
}

export function NotificationCenter({
  initialUnreadCount,
  studentId,
}: {
  initialUnreadCount: number;
  studentId: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useStudentNotificationStore(studentId, initialUnreadCount);
  const paramsString = searchParams.toString();
  const activeFilter = parseNotificationFilter(searchParams.get("filter"));
  const activeType = parseNotificationTypeFilter(searchParams.get("type"));
  const query = (searchParams.get("q") ?? "").slice(0, 120);
  const openId = searchParams.get("open");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [keyboardIndex, setKeyboardIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const attemptedOpenId = useRef<string | null>(null);
  const previousFirstIdRef = useRef<string | null>(null);
  const previousScrollHeightRef = useRef(0);

  const notifications = state.notifications;
  const loadNotification = state.loadNotification;
  const markRead = state.markRead;
  const markManyRead = state.markManyRead;

  const updateUrl = useCallback(
    (updates: Record<string, string | null>, replace = false) => {
      const current = new URLSearchParams(paramsString);
      const href = createNotificationUrl(current, updates);
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [paramsString, router],
  );
  const updateUrlRef = useRef(updateUrl);
  useEffect(() => {
    updateUrlRef.current = updateUrl;
  }, [updateUrl]);

  useEffect(() => {
    if (!openId || notifications.some((item) => item.publicId === openId)) {
      attemptedOpenId.current = null;
      return;
    }
    if (attemptedOpenId.current === openId) return;
    attemptedOpenId.current = openId;
    void loadNotification(openId);
  }, [loadNotification, notifications, openId]);

  const displayedNotifications = useMemo(
    () =>
      filterNotifications(
        notifications,
        activeFilter,
        activeType,
        query,
      ),
    [activeFilter, activeType, notifications, query],
  );
  const groups = useMemo(
    () => groupNotificationsByDate(displayedNotifications),
    [displayedNotifications],
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
  const selectedNotification = openId
    ? displayedNotifications.find((item) => item.publicId === openId) ??
      notifications.find((item) => item.publicId === openId)
    : displayedNotifications[0];
  const selectedIndex = selectedNotification
    ? displayedNotifications.findIndex(
        (item) => item.publicId === selectedNotification.publicId,
      )
    : -1;

  const selectNotification = useCallback(
    (notification: StudentNotificationItem) => {
      void markRead(notification.publicId);
      setKeyboardIndex(
        displayedNotifications.findIndex(
          (item) => item.publicId === notification.publicId,
        ),
      );
      updateUrl({ open: notification.publicId });
    },
    [displayedNotifications, markRead, updateUrl],
  );

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement)
      ) {
        return;
      }
      if (displayedNotifications.length === 0) return;
      if (event.key === "Escape" && openId) {
        event.preventDefault();
        updateUrl({ open: null }, true);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const start = selectedIndex >= 0 ? selectedIndex : keyboardIndex;
        const nextIndex = Math.max(
          0,
          Math.min(displayedNotifications.length - 1, start + direction),
        );
        setKeyboardIndex(nextIndex);
        updateUrl({ open: displayedNotifications[nextIndex].publicId }, true);
      } else if (event.key === "Enter") {
        const index = selectedIndex >= 0 ? selectedIndex : keyboardIndex;
        const item = displayedNotifications[index];
        if (item) {
          event.preventDefault();
          selectNotification(item);
        }
      } else if (event.key.toLocaleLowerCase("en-US") === "m") {
        const index = selectedIndex >= 0 ? selectedIndex : keyboardIndex;
        const item = displayedNotifications[index];
        if (item) {
          event.preventDefault();
          void markRead(item.publicId);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    displayedNotifications,
    keyboardIndex,
    openId,
    selectNotification,
    selectedIndex,
    markRead,
    updateUrl,
  ]);

  useEffect(() => {
    if (openId) {
      listRef.current
        ?.querySelector<HTMLElement>(
          `[data-notification-id="${CSS.escape(openId)}"]`,
        )
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [openId, notifications]);

  useEffect(() => {
    if (searchInputRef.current && searchInputRef.current.value !== query) {
      searchInputRef.current.value = query;
    }
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  }, [query]);

  useEffect(
    () => () => {
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
      }
    },
    [],
  );

  function scheduleSearch(value: string) {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      updateUrlRef.current({
        q: value.trim().slice(0, 120) || null,
      }, true);
    }, 250);
  }

  function toggleChecked(publicId: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  async function markSelectedRead() {
    const success = await markManyRead([...checkedIds]);
    if (success) setCheckedIds(new Set());
  }

  function onDetailKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && openId) {
      event.preventDefault();
      updateUrl({ open: null }, true);
    }
  }

  const hasActiveFilters = activeFilter !== "all" || activeType !== null || query.length > 0;
  const noNotifications = state.loaded && notifications.length === 0;
  const allReadState =
    state.loaded &&
    notifications.length > 0 &&
    activeFilter === "unread" &&
    state.unreadCount === 0 &&
    activeType === null &&
    query.length === 0;
  const noFilterResults =
    state.loaded && notifications.length > 0 && displayedNotifications.length === 0;

  return (
    <div className={styles.center}>
      <div className={styles.pageHeading}>
        <p>{state.unreadCount} непрочитанных</p>
        {state.unreadCount > 0 && (
          <button
            className={styles.secondaryButton}
            disabled={state.actionPending}
            onClick={() => void state.markAllRead()}
            type="button"
          >
            Прочитать все
          </button>
        )}
      </div>
      <p aria-live="polite" className={styles.liveMessage}>
        {state.message}
      </p>

      <div className={`${styles.mainGrid} ${openId ? styles.mobileDetailOpen : ""}`}>
        <section
          aria-label="Список уведомлений"
          className={styles.listPanel}
        >
          <div className={styles.filters}>
            <nav aria-label="Фильтр прочтения" className={styles.segments}>
              {(["all", "unread"] as const).map((filter) => (
                <button
                  aria-pressed={activeFilter === filter}
                  className={activeFilter === filter ? styles.segmentActive : ""}
                  key={filter}
                  onClick={() =>
                    updateUrl({
                      filter: filter === "unread" ? "unread" : null,
                    })
                  }
                  type="button"
                >
                  {filter === "all" ? "Все" : `Непрочитанные ${state.unreadCount}`}
                </button>
              ))}
            </nav>
            <div aria-label="Фильтр по типу" className={styles.typeFilters}>
              {typeFilters.map(({ value, label }) => (
                <button
                  aria-pressed={activeType === value}
                  className={activeType === value ? styles.typeActive : ""}
                  key={value}
                  onClick={() =>
                    updateUrl({
                      type: activeType === value ? null : value,
                    })
                  }
                  type="button"
                >
                  {label}
                  <span>{state.typeCounts[toNotificationType(value)]}</span>
                </button>
              ))}
            </div>
            <label className={styles.search}>
              <span className={styles.visuallyHidden}>Поиск уведомлений</span>
              <svg
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                maxLength={120}
                onChange={(event) => scheduleSearch(event.target.value)}
                placeholder="Поиск по уведомлениям"
                ref={searchInputRef}
                defaultValue={query}
                type="search"
              />
            </label>
            {hasActiveFilters && (
              <button
                className={styles.resetButton}
                onClick={() =>
                  updateUrl({ filter: null, type: null, q: null })
                }
                type="button"
              >
                Сбросить
              </button>
            )}
          </div>

          {checkedIds.size > 0 && (
            <div className={styles.bulkBar}>
              <span>Выбрано: {checkedIds.size}</span>
              <button
                disabled={state.actionPending}
                onClick={() => void markSelectedRead()}
                type="button"
              >
                Отметить прочитанными
              </button>
            </div>
          )}

          {state.error && notifications.length === 0 && (
            <EmptyState
              action={
                <button onClick={() => void state.refresh()} type="button">
                  Повторить
                </button>
              }
              className={styles.errorState}
              description={state.error}
              illustration="error"
              role="alert"
              title="Не удалось загрузить уведомления"
            />
          )}
          {state.loading && notifications.length === 0 ? (
            <div aria-label="Загрузка уведомлений" className={styles.skeleton}>
              <span /><span /><span /><span />
            </div>
          ) : noNotifications ? (
            <EmptyState
              className={styles.emptyState}
              description={
                activeFilter === "unread"
                  ? "Непрочитанных уведомлений нет. Вы ничего не пропустили."
                  : "Здесь появятся важные изменения и напоминания для вас."
              }
              illustration="notifications"
              title={
                activeFilter === "unread" ? "Все прочитано" : "Уведомлений нет"
              }
            />
          ) : allReadState ? (
            <EmptyState
              className={styles.emptyState}
              description="Непрочитанных уведомлений нет. Вы ничего не пропустили."
              illustration="notifications"
              title="Все прочитано"
            />
          ) : noFilterResults ? (
            <EmptyState
              action={
                <button
                  onClick={() => updateUrl({ filter: null, type: null, q: null })}
                  type="button"
                >
                  Сбросить фильтры
                </button>
              }
              className={styles.emptyState}
              description="Измените запрос или сбросьте фильтры."
              illustration="search"
              title="Ничего не найдено по фильтрам"
            />
          ) : (
            <>
              <div
                aria-label="Список уведомлений"
                className={styles.notificationGroups}
                ref={listRef}
                role="list"
              >
                {groups.map((group) => (
                  <section
                    className={styles.group}
                    key={group.key}
                    role="listitem"
                  >
                    <h3 className={styles.groupHeading} id={`group-${group.key}`}>
                      {group.label}
                    </h3>
                    <div
                      aria-labelledby={`group-${group.key}`}
                      className={styles.groupItems}
                      role="list"
                    >
                      {group.notifications.map((notification) => (
                        <NotificationRow
                          actionPending={state.actionPending}
                          checked={checkedIds.has(notification.publicId)}
                          key={notification.publicId}
                          notification={notification}
                          onSelect={() => selectNotification(notification)}
                          onToggleChecked={() => toggleChecked(notification.publicId)}
                          onToggleRead={() =>
                            void (
                              notification.readAt === null
                                ? markRead(notification.publicId)
                                : state.markUnread(notification.publicId)
                            )
                          }
                          selected={
                            selectedNotification?.publicId === notification.publicId
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              {state.hasMore && (
                <button
                  className={styles.loadMore}
                  disabled={state.loading}
                  onClick={() => void state.loadMore()}
                  type="button"
                >
                  {state.loading ? "Загружаем…" : "Показать ещё"}
                </button>
              )}
            </>
          )}
          {state.error && notifications.length > 0 && (
            <p className={styles.inlineError} role="alert">{state.error}</p>
          )}
        </section>

        <div className={styles.mobileDetail} onKeyDown={onDetailKeyDown}>
          {selectedNotification ? (
            <>
              <button
                className={styles.backToList}
                onClick={() => updateUrl({ open: null }, true)}
                type="button"
              >
                ‹ Назад к списку
              </button>
              <NotificationDetails
                actionPending={state.actionPending}
                idSuffix="mobile"
                notification={selectedNotification}
                onToggleRead={() => {
                  void (
                    selectedNotification.readAt === null
                      ? markRead(selectedNotification.publicId)
                      : state.markUnread(selectedNotification.publicId)
                  );
                }}
                onOpenTarget={(href) => {
                  void markRead(selectedNotification.publicId).then(
                    (success) => {
                      if (success) router.push(href);
                    },
                  );
                }}
              />
            </>
          ) : openId ? (
            <div className={styles.emptyState} role="status">
              <strong>{state.error ? "Уведомление недоступно" : "Загружаем уведомление…"}</strong>
              {state.error && <p>{state.error}</p>}
              <button onClick={() => updateUrl({ open: null }, true)} type="button">
                ‹ Назад к списку
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.desktopDetail} onKeyDown={onDetailKeyDown}>
          {selectedNotification && (
            <NotificationDetails
              actionPending={state.actionPending}
              idSuffix="desktop"
              notification={selectedNotification}
              onToggleRead={() => {
                void (
                  selectedNotification.readAt === null
                    ? markRead(selectedNotification.publicId)
                    : state.markUnread(selectedNotification.publicId)
                );
              }}
              onOpenTarget={(href) => {
                void markRead(selectedNotification.publicId).then(
                  (success) => {
                    if (success) router.push(href);
                  },
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

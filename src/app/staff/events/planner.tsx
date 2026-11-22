"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Clock,
  Copy,
  EditPencil,
  Eye,
  EyeClosed,
  MapPin,
  NavArrowLeft,
  NavArrowRight,
  Plus,
  Trash,
  User,
} from "iconoir-react";
import type {
  EventApprovalItem,
  EventApprovalStatus,
} from "@/generated/prisma/enums";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateTimeStack } from "@/components/date-time-stack";
import controls from "@/components/ui/controls.module.css";
import { formatMoscowTime } from "@/lib/campus-time";
import {
  approvalItemLabels,
  approvalItems,
  approvalStatuses,
  digestStateLabels,
  getApprovalLabel,
  getApprovalStatusLabel,
  getDigestState,
  getPublicationBlockers,
  hasApprovalValue,
  type DigestState,
} from "@/lib/event-approvals";
import { eventStatusLabels, eventTypeLabels } from "@/lib/event-constants";
import type { EventRecord } from "@/lib/event-data";
import {
  copyEventToNextWeekAction,
  deleteEventAction,
  publishReadyEventsAction,
  setEventApprovalAction,
  setEventPublicationAction,
  type EventCommandResult,
} from "./actions";
import { EventDrawer } from "./event-drawer";
import styles from "./events.module.css";

export type PlannerWeekTab = {
  key: string;
  href: string;
  range: string;
  relative: string | null;
  total: number;
  published: number;
  state: DigestState;
};

type PlannerDay = {
  dateKey: string;
  dateLabel: string;
  isToday: boolean;
  events: EventRecord[];
};

const itemIcons = { SPEAKER: User, ROOM: MapPin, TIME: Clock };

function getItemValue(event: EventRecord, item: EventApprovalItem): string {
  if (!hasApprovalValue(event, item)) {
    return item === "TIME" ? "не указано" : item === "ROOM" ? "не указана" : "не указан";
  }
  if (item === "SPEAKER") return event.host ?? "";
  if (item === "ROOM") return event.location ?? "";
  return event.startsAt && event.endsAt
    ? `${formatMoscowTime(event.startsAt)}–${formatMoscowTime(event.endsAt)}`
    : "";
}

export function DigestPlanner({
  currentHref,
  days,
  nextHref,
  previousHref,
  range,
  tabs,
  weekKey,
}: {
  currentHref: string;
  days: PlannerDay[];
  nextHref: string;
  previousHref: string;
  range: string;
  tabs: PlannerWeekTab[];
  weekKey: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ open: boolean; event?: EventRecord; dateKey: string }>({
    open: false,
    dateKey: weekKey,
  });
  const [deleting, setDeleting] = useState<EventRecord | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const events = days.flatMap((day) => day.events);
  const published = events.filter((event) => event.status === "PUBLISHED").length;
  const ready = events.filter(
    (event) => event.status === "DRAFT" && getPublicationBlockers(event).length === 0,
  ).length;
  const waiting = events.length - published - ready;
  const state = getDigestState(events);
  const hasCurrentTab = tabs.some((tab) => tab.relative === "Эта неделя");

  function run(action: () => Promise<EventCommandResult>) {
    setNotice(null);
    startTransition(async () => {
      const result = await action().catch((): EventCommandResult => ({
        ok: false,
        error: "Не удалось связаться с сервером. Попробуйте ещё раз.",
      }));
      setNotice(
        result.ok
          ? { tone: "success", text: result.message }
          : { tone: "error", text: result.error },
      );
      if (result.ok && result.weekKey) {
        router.push(`/staff/events?week=${result.weekKey}`);
      } else {
        router.refresh();
      }
    });
  }

  function add(dateKey: string) {
    setNotice(null);
    setEditor({ open: true, dateKey });
  }

  return (
    <div className={styles.workspace}>
      <nav aria-label="Выбор недели" className={styles.weeks}>
        <Link aria-label="Предыдущая неделя" className={controls.iconButton} href={previousHref}>
          <NavArrowLeft aria-hidden="true" />
        </Link>
        <ul>
          {tabs.map((tab) => (
            <li key={tab.key}>
              <Link
                aria-current={tab.key === weekKey ? "page" : undefined}
                className={styles.week}
                href={tab.href}
              >
                <span className={styles.weekRelative}>{tab.relative ?? " "}</span>
                <strong>{tab.range}</strong>
                <span className={styles.weekState} data-state={tab.state}>
                  {tab.total === 0
                    ? digestStateLabels.empty
                    : `вышло ${tab.published} из ${tab.total}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link aria-label="Следующая неделя" className={controls.iconButton} href={nextHref}>
          <NavArrowRight aria-hidden="true" />
        </Link>
      </nav>

      <section aria-labelledby="digest-summary-title" className={styles.summary}>
        <div className={styles.summaryText}>
          <div className={styles.summaryTitle}>
            <h2 id="digest-summary-title">Неделя {range}</h2>
            <span className={styles.stateBadge} data-state={state}>
              {digestStateLabels[state]}
            </span>
          </div>
          <p>
            {events.length === 0
              ? "Добавьте первое событие: оно сохранится как черновик."
              : [
                  published > 0 && `опубликовано: ${published}`,
                  ready > 0 && `готово к публикации: ${ready}`,
                  waiting > 0 && `на согласовании: ${waiting}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        <div className={styles.summaryActions}>
          {hasCurrentTab ? null : (
            <Link className={controls.ghost} href={currentHref}>
              К этой неделе
            </Link>
          )}
          {ready > 0 ? (
            <button
              className={controls.secondary}
              disabled={isPending}
              onClick={() => run(() => publishReadyEventsAction(weekKey))}
              type="button"
            >
              Опубликовать готовые: {ready}
            </button>
          ) : null}
          <button
            className={controls.primary}
            onClick={() => add(days.find((day) => day.isToday)?.dateKey ?? weekKey)}
            type="button"
          >
            <Plus aria-hidden="true" height={18} width={18} />
            Добавить событие
          </button>
        </div>
      </section>

      <div aria-live="polite" className={styles.notice}>
        {notice ? (
          <p className={notice.tone === "success" ? controls.success : controls.alert}>
            {notice.text}
          </p>
        ) : null}
      </div>

      <div aria-busy={isPending} className={styles.days}>
        {days.map((day) => (
          <section
            aria-labelledby={`staff-day-${day.dateKey}`}
            className={styles.day}
            data-today={day.isToday || undefined}
            key={day.dateKey}
          >
            <header className={styles.dayHeader}>
              <h3 id={`staff-day-${day.dateKey}`}>{day.dateLabel}</h3>
              <button
                aria-label={`Добавить событие: ${day.dateLabel}`}
                className={styles.addToDay}
                onClick={() => add(day.dateKey)}
                type="button"
              >
                <Plus aria-hidden="true" /> Добавить
              </button>
            </header>
            {day.events.length === 0 ? (
              <p className={styles.emptyDay}>Событий нет</p>
            ) : (
              <ul className={styles.eventList}>
                {day.events.map((event) => (
                  <EventCard
                    event={event}
                    isPending={isPending}
                    key={event.id}
                    onApprove={(item, status) =>
                      run(() => setEventApprovalAction(event.id, item, status))
                    }
                    onCopy={() => run(() => copyEventToNextWeekAction(event.id))}
                    onDelete={() => setDeleting(event)}
                    onEdit={() => {
                      setNotice(null);
                      setEditor({ open: true, event, dateKey: day.dateKey });
                    }}
                    onPublish={(isPublished) =>
                      run(() => setEventPublicationAction(event.id, isPublished))
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <EventDrawer
        dateKey={editor.dateKey}
        event={editor.event}
        onClose={() => setEditor((current) => ({ ...current, open: false }))}
        onSaved={(text) => {
          setEditor((current) => ({ ...current, open: false }));
          setNotice({ tone: "success", text });
          router.refresh();
        }}
        open={editor.open}
      />
      <ConfirmDialog
        confirmLabel="Удалить событие"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) run(() => deleteEventAction(target.id));
        }}
        open={deleting !== null}
        title="Удалить событие?"
      >
        <p>
          «{deleting?.title}» исчезнет из дайджеста без возможности восстановления.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function EventCard({
  event,
  isPending,
  onApprove,
  onCopy,
  onDelete,
  onEdit,
  onPublish,
}: {
  event: EventRecord;
  isPending: boolean;
  onApprove: (item: EventApprovalItem, status: EventApprovalStatus) => void;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPublish: (isPublished: boolean) => void;
}) {
  const isPublished = event.status === "PUBLISHED";
  const blockers = getPublicationBlockers(event);
  const isReady = !isPublished && blockers.length === 0;

  return (
    <li className={styles.eventCard} data-status={event.status}>
      <div className={styles.eventMain}>
        <div className={styles.eventTopline}>
          <span>{eventTypeLabels[event.type]}</span>
          <span
            className={styles.statusBadge}
            data-status={isReady ? "READY" : event.status}
          >
            {isReady ? "Готово к публикации" : eventStatusLabels[event.status]}
          </span>
        </div>
        <h4>{event.title}</h4>
        {event.description ? <p className={styles.eventText}>{event.description}</p> : null}
      </div>

      <ul aria-label="Согласования" className={styles.approvals}>
        {approvalItems.map((item) => {
          const Icon = itemIcons[item];
          const approval = event.approvals[item];
          return (
            <li key={item}>
              <Icon aria-hidden="true" />
              <div className={styles.approvalText}>
                <span className={styles.approvalValue}>
                  <span className={controls.visuallyHidden}>
                    {approvalItemLabels[item]}:{" "}
                  </span>
                  {getItemValue(event, item)}
                </span>
                {approval.note ? (
                  <span className={styles.approvalNote}>{approval.note}</span>
                ) : approval.status === "APPROVED" && approval.approvedAt ? (
                  <span className={styles.approvalNote}>
                    {approval.approvedBy ? `${approval.approvedBy}, ` : ""}
                    <DateTimeStack value={approval.approvedAt} variant="moment" />
                  </span>
                ) : null}
              </div>
              <select
                aria-label={`${approvalItemLabels[item]}: статус согласования`}
                className={styles.approvalSelect}
                data-approval={approval.status}
                disabled={isPending}
                onChange={(change) => {
                  const status = approvalStatuses.find(
                    (candidate) => candidate === change.currentTarget.value,
                  );
                  if (status) onApprove(item, status);
                }}
                title={getApprovalLabel(item, approval.status)}
                value={approval.status}
              >
                {approvalStatuses.map((status) => (
                  <option key={status} value={status}>
                    {getApprovalLabel(item, status)}
                  </option>
                ))}
                {approval.status === "NOT_REQUIRED" ? (
                  <option value="NOT_REQUIRED">
                    {approvalItemLabels[item]} {getApprovalStatusLabel(item, "NOT_REQUIRED")}
                  </option>
                ) : null}
              </select>
            </li>
          );
        })}
      </ul>

      <div className={styles.eventActions}>
        {isPublished ? (
          <button
            className={controls.secondary}
            disabled={isPending}
            onClick={() => onPublish(false)}
            type="button"
          >
            <EyeClosed aria-hidden="true" height={18} width={18} />
            Вернуть в черновики
          </button>
        ) : (
          <button
            className={isReady ? controls.primary : controls.secondary}
            disabled={isPending || !isReady}
            onClick={() => onPublish(true)}
            title={isReady ? undefined : `Осталось: ${blockers.join(", ")}`}
            type="button"
          >
            <Eye aria-hidden="true" height={18} width={18} />
            Опубликовать
          </button>
        )}
        <span className={styles.iconActions}>
          <button
            aria-label={`Изменить: ${event.title}`}
            className={controls.iconButton}
            onClick={onEdit}
            title="Изменить"
            type="button"
          >
            <EditPencil aria-hidden="true" />
          </button>
          <button
            aria-label={`Скопировать на следующую неделю: ${event.title}`}
            className={controls.iconButton}
            disabled={isPending}
            onClick={onCopy}
            title="Скопировать на следующую неделю"
            type="button"
          >
            <Copy aria-hidden="true" />
          </button>
          <button
            aria-label={`Удалить: ${event.title}`}
            className={controls.iconButton}
            disabled={isPending}
            onClick={onDelete}
            title="Удалить"
            type="button"
          >
            <Trash aria-hidden="true" />
          </button>
        </span>
      </div>
      {!isPublished && blockers.length > 0 ? (
        <p className={styles.blockers}>До публикации: {blockers.join(", ")}</p>
      ) : null}
    </li>
  );
}

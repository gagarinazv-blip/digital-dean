"use client";

import Link from "next/link";
import { Xmark } from "iconoir-react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { DeadlineHandIn } from "@/components/deadline-hand-in";
import { DeadlineRemaining } from "@/components/deadline-remaining";
import { deadlineFormatLabels } from "@/lib/campus-labels";
import { getDeadlineHref } from "@/lib/deadline-action";
import type { NotificationDeadlineDetails } from "@/lib/notification-types";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "./deadline-preview.module.css";

const focusableSelector = "a[href], button:not(:disabled)";

export function DeadlinePreview({
  deadline,
  onClose,
}: {
  deadline: NotificationDeadlineDetails;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const focusable = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
    ];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className={styles.dialog}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onClose={onClose}
      onKeyDown={keepFocusInside}
      ref={dialogRef}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>{deadline.subject}</p>
          <button
            aria-label="Закрыть предпросмотр"
            className={styles.close}
            onClick={close}
            type="button"
          >
            <Xmark aria-hidden="true" strokeWidth={1.8} />
          </button>
        </div>
        <h2 className={styles.title} id={titleId}>
          {deadline.title}
        </h2>
        {deadline.topic && (
          <p className={styles.topic}>Тема: {deadline.topic}</p>
        )}
        <DeadlineRemaining
          dueAt={deadline.dueAt}
          remaining={deadline.remaining}
        />
        <p className={styles.format}>
          Формат: <strong>{deadlineFormatLabels[deadline.format]}</strong>
        </p>
        <div className={styles.actions}>
          <DeadlineHandIn
            deadlineId={deadline.id}
            dueAt={deadline.dueAt}
            format={deadline.format}
            location={deadline.location}
            showCalendar
            taskUrl={deadline.taskUrl}
          />
          <Link
            className={workflowStyles.secondaryButton}
            href={getDeadlineHref(deadline.id)}
            onClick={close}
          >
            Страница дедлайна
          </Link>
        </div>
      </div>
    </dialog>
  );
}

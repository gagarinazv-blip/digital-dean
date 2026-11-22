"use client";

import Link from "next/link";
import { useState } from "react";
import { DeadlineHandIn } from "@/components/deadline-hand-in";
import { DeadlineRemaining } from "@/components/deadline-remaining";
import { Drawer } from "@/components/ui/drawer";
import controls from "@/components/ui/controls.module.css";
import { deadlineFormatLabels } from "@/lib/campus-labels";
import { getDeadlineHref } from "@/lib/deadline-action";
import type { NotificationDeadlineDetails } from "@/lib/notification-types";
import styles from "./deadline-preview.module.css";

export function DeadlinePreview({
  deadline,
  onClose,
}: {
  deadline: NotificationDeadlineDetails;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);

  function close() {
    setOpen(false);
    onClose();
  }

  return (
    <Drawer
      eyebrow={deadline.subject}
      footer={
        <Link
          className={controls.primary}
          href={getDeadlineHref(deadline.id)}
          onClick={close}
        >
          Страница дедлайна
        </Link>
      }
      onClose={close}
      open={open}
      title={deadline.title}
    >
      <div className={styles.content}>
        {deadline.topic && <p>Тема: {deadline.topic}</p>}
        <DeadlineRemaining
          dueAt={deadline.dueAt}
          remaining={deadline.remaining}
        />
        <p>
          Формат: <strong>{deadlineFormatLabels[deadline.format]}</strong>
        </p>
        <DeadlineHandIn
          deadlineId={deadline.id}
          dueAt={deadline.dueAt}
          format={deadline.format}
          location={deadline.location}
          showCalendar
          taskUrl={deadline.taskUrl}
        />
      </div>
    </Drawer>
  );
}

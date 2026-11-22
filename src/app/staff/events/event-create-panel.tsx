"use client";

import { useState } from "react";
import { createEventAction } from "./actions";
import { EventForm } from "./event-form";
import styles from "./events.module.css";

export function EventCreatePanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-controls="add-event-form"
        aria-expanded={open}
        className={styles.addButton}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? "Скрыть форму" : "Добавить событие"}
      </button>
      {open ? (
        <section
          aria-label="Новое событие"
          className={styles.createPanel}
          id="add-event-form"
        >
          <EventForm action={createEventAction} submitLabel="Добавить событие" />
        </section>
      ) : null}
    </>
  );
}

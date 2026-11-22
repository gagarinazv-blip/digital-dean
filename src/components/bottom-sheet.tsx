"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./bottom-sheet.module.css";

export function BottomSheet({
  children,
  title,
  triggerAriaLabel,
  triggerClassName,
  triggerLabel,
}: {
  children: ReactNode;
  title: string;
  triggerAriaLabel: string;
  triggerClassName: string;
  triggerLabel: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dialogId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        onClick={() => setOpen(true)}
        type="button"
      >
        {triggerLabel}
      </button>
      <dialog
        aria-labelledby={titleId}
        className={styles.dialog}
        id={dialogId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => setOpen(false)}
        onClickCapture={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a")
          ) {
            close();
          }
        }}
        onSubmitCapture={close}
        ref={dialogRef}
      >
        <div className={styles.sheet}>
          <header className={styles.header}>
            <h2 id={titleId}>{title}</h2>
            <button
              aria-label="Закрыть"
              className={styles.closeButton}
              onClick={close}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          <footer className={styles.footer}>
            <button className={styles.doneButton} onClick={close} type="button">
              Готово
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./confirmation-dialog.module.css";

export function ConfirmationDialog({
  buttonClassName,
  buttonLabel,
  children,
  onOpenChange,
  open,
  title,
}: {
  buttonClassName: string;
  buttonLabel: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <>
      <button
        className={buttonClassName}
        onClick={() => onOpenChange(true)}
        type="button"
      >
        {buttonLabel}
      </button>
      <dialog
        aria-labelledby={titleId}
        className={styles.dialog}
        onClose={() => onOpenChange(false)}
        ref={dialogRef}
      >
        <div className={styles.content}>
          <h2 id={titleId}>{title}</h2>
          {children}
        </div>
      </dialog>
    </>
  );
}

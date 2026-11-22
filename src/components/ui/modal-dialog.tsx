"use client";

import { useId, type ReactNode } from "react";
import { useModalDialog } from "./use-modal-dialog";
import styles from "./modal-dialog.module.css";

// Компактное окно для подтверждений. Формы открываются в Drawer.
export function ModalDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const { ref, dialogProps } = useModalDialog({
    open,
    onRequestClose: onClose,
    onClosed: () => {
      if (open) onClose();
    },
  });

  return (
    <dialog
      {...dialogProps}
      aria-labelledby={titleId}
      aria-modal="true"
      className={styles.dialog}
      data-modal=""
      ref={ref}
      role="dialog"
    >
      <div className={styles.content}>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

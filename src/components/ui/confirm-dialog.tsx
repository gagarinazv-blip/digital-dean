"use client";

import type { ReactNode } from "react";
import { ModalDialog } from "./modal-dialog";
import controls from "./controls.module.css";
import styles from "./modal-dialog.module.css";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Отмена",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalDialog onClose={onCancel} open={open} title={title}>
      {children}
      <div className={styles.actions}>
        <button
          className={controls.secondary}
          data-autofocus=""
          onClick={onCancel}
          type="button"
        >
          {cancelLabel}
        </button>
        <button className={controls.danger} onClick={onConfirm} type="button">
          {confirmLabel}
        </button>
      </div>
    </ModalDialog>
  );
}

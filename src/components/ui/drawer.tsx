"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Xmark } from "iconoir-react";
import { ConfirmDialog } from "./confirm-dialog";
import { useModalDialog } from "./use-modal-dialog";
import controls from "./controls.module.css";
import styles from "./drawer.module.css";

const EXIT_MILLISECONDS = 260;

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  mode = "side",
  isDirty = false,
  isBusy = false,
  id,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Функция получает закрытие с проверкой несохранённых изменений. */
  footer?: ReactNode | ((requestClose: () => void) => ReactNode);
  /** side — панель справа, full — окно на весь экран. */
  mode?: "side" | "full";
  /** Есть несохранённые изменения: перед закрытием спросим подтверждение. */
  isDirty?: boolean;
  /** Идёт сохранение: закрывать окно нельзя. */
  isBusy?: boolean;
  id?: string;
}) {
  const titleId = useId();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPresent, setIsPresent] = useState(open);
  if (open && !isPresent) setIsPresent(true);
  if (!open && isConfirming) setIsConfirming(false);

  // Содержимое остаётся до конца анимации закрытия, затем сбрасывается.
  useEffect(() => {
    if (open || !isPresent) return;
    const timer = window.setTimeout(() => setIsPresent(false), EXIT_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [open, isPresent]);

  useEffect(() => {
    if (!open || !isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open, isDirty]);

  function requestClose() {
    if (isBusy) return;
    if (isDirty) setIsConfirming(true);
    else onClose();
  }

  const { ref, dialogProps } = useModalDialog({
    open,
    onRequestClose: requestClose,
    onClosed: () => {
      if (open) onClose();
    },
  });

  // Отключённые на время сохранения поля теряют фокус; оставляем его в окне.
  useEffect(() => {
    if (!isBusy) return;
    // Браузер снимает фокус с отключённого элемента уже после отрисовки.
    const timer = window.setTimeout(() => {
      const dialog = ref.current;
      if (dialog?.open && !dialog.contains(document.activeElement)) {
        dialog.focus();
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isBusy, ref]);

  return (
    <dialog
      {...dialogProps}
      aria-labelledby={titleId}
      aria-modal="true"
      className={styles.drawer}
      data-modal=""
      data-mode={mode}
      id={id}
      ref={ref}
      role="dialog"
      tabIndex={-1}
    >
      {isPresent ? (
        <div className={styles.panel}>
          <header className={styles.header}>
            <div className={styles.heading}>
              {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
              <h2 className={styles.title} id={titleId}>
                {title}
              </h2>
              {description ? (
                <p className={styles.description}>{description}</p>
              ) : null}
            </div>
            <button
              aria-label="Закрыть"
              className={controls.iconButton}
              disabled={isBusy}
              onClick={requestClose}
              type="button"
            >
              <Xmark aria-hidden="true" strokeWidth={1.8} />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          {footer ? (
            <footer className={styles.footer}>
              {typeof footer === "function" ? footer(requestClose) : footer}
            </footer>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        cancelLabel="Вернуться к форме"
        confirmLabel="Закрыть без сохранения"
        onCancel={() => setIsConfirming(false)}
        onConfirm={() => {
          setIsConfirming(false);
          onClose();
        }}
        open={open && isConfirming}
        title="Закрыть без сохранения?"
      >
        <p>Внесённые изменения будут потеряны.</p>
      </ConfirmDialog>
    </dialog>
  );
}

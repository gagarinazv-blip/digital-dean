"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from "react";

const focusableSelector = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled):not([type='hidden'])",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// Поля закрытых вложенных окон в обход по Tab не входят.
function isReachable(element: HTMLElement, dialog: HTMLElement): boolean {
  return (
    element.closest("dialog") === dialog &&
    !element.closest("[hidden], [inert]")
  );
}

// Общее поведение всех модальных окон: нативный <dialog> в верхнем слое,
// закрытие по Esc и фону, удержание фокуса и его возврат на источник.
export function useModalDialog({
  open,
  onRequestClose,
  onClosed,
}: {
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pressedBackdropRef = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(
    () => () => {
      // Окно размонтировали открытым: браузер фокус сам не вернёт.
      const trigger = triggerRef.current;
      queueMicrotask(() => {
        if (trigger?.isConnected && document.activeElement === document.body) {
          trigger.focus();
        }
      });
    },
    [],
  );

  function isOwnEvent(event: SyntheticEvent): boolean {
    return (
      event.target instanceof Element &&
      event.target.closest("dialog") === ref.current
    );
  }

  const dialogProps = {
    onCancel(event: SyntheticEvent<HTMLDialogElement>) {
      // Событие cancel всплывает и от <input type="file">.
      if (event.target !== event.currentTarget) return;
      event.preventDefault();
      onRequestClose();
    },
    onClose(event: SyntheticEvent<HTMLDialogElement>) {
      if (event.target !== event.currentTarget) return;
      const trigger = triggerRef.current;
      triggerRef.current = null;
      if (trigger?.isConnected) trigger.focus();
      onClosed();
    },
    onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
      if (!isOwnEvent(event)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onRequestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter((element) => isReachable(element, event.currentTarget));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === event.currentTarget)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    onMouseDown(event: MouseEvent<HTMLDialogElement>) {
      pressedBackdropRef.current = event.target === event.currentTarget;
    },
    onClick(event: MouseEvent<HTMLDialogElement>) {
      // Отпущенное за окном выделение текста не считается кликом по фону.
      const isBackdrop =
        event.target === event.currentTarget && pressedBackdropRef.current;
      pressedBackdropRef.current = false;
      if (isBackdrop) onRequestClose();
    },
  };

  return { ref, dialogProps };
}

"use client";

import type { ReactNode } from "react";
import { ModalDialog } from "@/components/ui/modal-dialog";

// Кнопка и компактное окно подтверждения к ней.
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
  return (
    <>
      <button
        aria-haspopup="dialog"
        className={buttonClassName}
        onClick={() => onOpenChange(true)}
        type="button"
      >
        {buttonLabel}
      </button>
      <ModalDialog onClose={() => onOpenChange(false)} open={open} title={title}>
        {children}
      </ModalDialog>
    </>
  );
}

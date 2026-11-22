"use client";

import { useId, useState, type ReactNode } from "react";
import { Drawer } from "@/components/ui/drawer";
import controls from "@/components/ui/controls.module.css";

// Кнопка, открывающая панель с фильтрами или списком ссылок.
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
  const dialogId = useId();
  const close = () => setOpen(false);

  return (
    <>
      <button
        aria-controls={dialogId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        onClick={() => setOpen(true)}
        type="button"
      >
        {triggerLabel}
      </button>
      <Drawer
        footer={
          <button className={controls.primary} onClick={close} type="button">
            Готово
          </button>
        }
        id={dialogId}
        onClose={close}
        open={open}
        title={title}
      >
        <div
          onClickCapture={(event) => {
            if (event.target instanceof Element && event.target.closest("a")) {
              close();
            }
          }}
          onSubmitCapture={close}
        >
          {children}
        </div>
      </Drawer>
    </>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import styles from "./opportunity.module.css";

export function OpportunityApplicationForm({
  action,
  children,
  formId,
  isLate,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  formId: string;
  isLate: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function confirmSubmission() {
    setDirty(false);
    setConfirmationOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <div
      onClick={(event) => {
        if (!dirty || !(event.target instanceof Element)) return;
        const anchor = event.target.closest("a");
        if (!anchor || !anchor.href.startsWith(window.location.origin)) return;
        if (!window.confirm("В форме есть заполненные данные. Покинуть страницу без отправки?")) {
          event.preventDefault();
        } else {
          setDirty(false);
        }
      }}
    >
      <form
        action={action}
        id={formId}
        ref={formRef}
        onChange={() => setDirty(true)}
        onSubmit={() => setDirty(false)}
      >
        {children}
      </form>
      <ConfirmationDialog
        buttonClassName={styles.submitButton}
        buttonLabel={isLate ? "Отправить индивидуальный запрос" : "Проверить и отправить"}
        onOpenChange={setConfirmationOpen}
        open={confirmationOpen}
        title="Проверьте данные и файлы"
      >
        <p>После отправки заявку можно будет только отозвать.</p>
        <div className={styles.confirmActions}>
          <button
            className={styles.submitButton}
            onClick={confirmSubmission}
            type="button"
          >
            Подтвердить отправку
          </button>
          <button
            className={styles.cancelButton}
            onClick={() => setConfirmationOpen(false)}
            type="button"
          >
            Вернуться к проверке
          </button>
        </div>
      </ConfirmationDialog>
    </div>
  );
}

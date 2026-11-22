"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import controls from "@/components/ui/controls.module.css";
import type { OpportunityApplicationAnswerField } from "@/lib/opportunity-catalog";
import styles from "./opportunity.module.css";

export function OpportunityApplicationAnswerFields({
  fields,
}: {
  fields: OpportunityApplicationAnswerField[];
}) {
  const [lookingForTeam, setLookingForTeam] = useState(false);

  return (
    <>
      {fields.map((field) => {
        if (field.visibleWhen === "notLookingForTeam" && lookingForTeam) {
          return null;
        }

        const id = `application-answer-${field.name}`;
        const hintId = field.hint ? `${id}-hint` : undefined;
        const label = `${field.label}${field.required ? " *" : ""}`;

        return (
          <label className={styles.formField} htmlFor={id} key={field.name}>
            {label}
            {field.type === "textarea" ? (
              <textarea
                aria-describedby={hintId}
                id={id}
                maxLength={field.maxLength}
                name={`answer_${field.name}`}
                required={field.required}
              />
            ) : field.type === "checkbox" ? (
              <input
                checked={field.name === "lookingForTeam" ? lookingForTeam : undefined}
                id={id}
                name={`answer_${field.name}`}
                onChange={
                  field.name === "lookingForTeam"
                    ? (event) => setLookingForTeam(event.currentTarget.checked)
                    : undefined
                }
                type="checkbox"
                value="true"
              />
            ) : field.type === "select" || field.type === "multiselect" ? (
              <select
                aria-describedby={hintId}
                id={id}
                multiple={field.type === "multiselect"}
                name={`answer_${field.name}`}
                required={field.required}
                size={field.type === "multiselect" ? 5 : undefined}
              >
                {field.type === "select" && (
                  <option value="">Выберите вариант</option>
                )}
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-describedby={hintId}
                id={id}
                maxLength={field.maxLength}
                name={`answer_${field.name}`}
                required={field.required}
                type="text"
              />
            )}
            {field.hint && <span id={hintId}>{field.hint}</span>}
          </label>
        );
      })}
    </>
  );
}

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
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const router = useRouter();

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
        event.preventDefault();
        setLeaveHref(anchor.href.slice(window.location.origin.length));
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
            className={controls.secondary}
            onClick={() => setConfirmationOpen(false)}
            type="button"
          >
            Вернуться к проверке
          </button>
          <button
            className={controls.primary}
            onClick={confirmSubmission}
            type="button"
          >
            Подтвердить отправку
          </button>
        </div>
      </ConfirmationDialog>
      <ConfirmDialog
        cancelLabel="Вернуться к форме"
        confirmLabel="Покинуть страницу"
        onCancel={() => setLeaveHref(null)}
        onConfirm={() => {
          const href = leaveHref;
          setLeaveHref(null);
          setDirty(false);
          if (href) router.push(href);
        }}
        open={leaveHref !== null}
        title="Закрыть без отправки?"
      >
        <p>Заполненные данные будут потеряны.</p>
      </ConfirmDialog>
    </div>
  );
}

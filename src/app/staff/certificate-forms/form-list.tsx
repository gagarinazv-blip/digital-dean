"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, EditPencil, Plus, Upload } from "iconoir-react";
import { DateTimeStack } from "@/components/date-time-stack";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import controls from "@/components/ui/controls.module.css";
import { pluralizeDays } from "@/lib/date-stack";
import type { ManagedCertificateForm } from "@/lib/certificate-forms";
import { formatDeliveryMethods } from "@/lib/request-catalog";
import {
  duplicateCertificateFormAction,
  setCertificateFormStatusAction,
  type CertificateFormActionResult,
} from "./actions";
import { CertificateFormDrawer } from "./form-drawer";
import styles from "./certificate-forms.module.css";

const statusPresentation: Record<
  ManagedCertificateForm["status"],
  { label: string; tone: string }
> = {
  DRAFT: { label: "Черновик", tone: "warning" },
  ACTIVE: { label: "Активна", tone: "success" },
  ARCHIVED: { label: "В архиве", tone: "neutral" },
};

export function CertificateFormList({
  forms,
}: {
  forms: ManagedCertificateForm[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ManagedCertificateForm | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [archiving, setArchiving] = useState<ManagedCertificateForm | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function edit(form?: ManagedCertificateForm) {
    setMessage("");
    setError("");
    setEditing(form);
    setIsEditorOpen(true);
  }

  async function run(
    code: string,
    action: () => Promise<CertificateFormActionResult>,
  ) {
    setPendingCode(code);
    setMessage("");
    setError("");
    try {
      const result = await action();
      if (result.ok) {
        setMessage(result.message);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setPendingCode(null);
    }
  }

  return (
    <section aria-labelledby="forms-title" className={styles.section}>
      <div className={styles.sectionHeading}>
        <h2 id="forms-title">
          Все виды <span className={styles.count}>{forms.length}</span>
        </h2>
        <button className={controls.primary} onClick={() => edit()} type="button">
          <Plus aria-hidden="true" height={18} width={18} />
          Новый вид справки
        </button>
      </div>
      {message ? (
        <p className={controls.success} role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className={controls.alert} role="alert">
          {error}
        </p>
      ) : null}
      {forms.length === 0 ? (
        <EmptyState
          className={styles.empty}
          description="Создайте первый вид справки, чтобы студенты могли её заказать."
          illustration="documents"
          title="Видов справок пока нет"
        />
      ) : (
        <ul className={styles.list}>
          {forms.map((form) => {
            const status = statusPresentation[form.status];
            const isPending = pendingCode === form.code;
            return (
              <li className={styles.item} key={form.code}>
                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>
                    <h3>{form.title}</h3>
                    <span className={controls.badge} data-tone={status.tone}>
                      {status.label}
                    </span>
                  </div>
                  <p className={styles.itemDescription}>{form.description}</p>
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>Срок</dt>
                    <dd>
                      {form.executionDays} раб.{" "}
                      {pluralizeDays(form.executionDays)}
                    </dd>
                  </div>
                  <div>
                    <dt>Получение</dt>
                    <dd>{formatDeliveryMethods(form.deliveryMethods)}</dd>
                  </div>
                  <div>
                    <dt>Заявок</dt>
                    <dd>{form.requestCount}</dd>
                  </div>
                  <div>
                    <dt>Изменён</dt>
                    <dd>
                      <DateTimeStack value={form.updatedAt} />
                    </dd>
                  </div>
                </dl>
                <div className={styles.itemActions}>
                  <button
                    className={controls.secondary}
                    disabled={isPending}
                    onClick={() => edit(form)}
                    type="button"
                  >
                    <EditPencil aria-hidden="true" height={18} width={18} />
                    Редактировать
                  </button>
                  <button
                    className={controls.ghost}
                    disabled={isPending}
                    onClick={() =>
                      void run(form.code, () =>
                        duplicateCertificateFormAction(form.code),
                      )
                    }
                    type="button"
                  >
                    <Copy aria-hidden="true" height={18} width={18} />
                    Дублировать
                  </button>
                  {form.status === "ACTIVE" ? (
                    <button
                      className={controls.ghost}
                      disabled={isPending}
                      onClick={() => setArchiving(form)}
                      type="button"
                    >
                      <Archive aria-hidden="true" height={18} width={18} />
                      В архив
                    </button>
                  ) : (
                    <button
                      className={controls.ghost}
                      disabled={isPending}
                      onClick={() =>
                        void run(form.code, () =>
                          setCertificateFormStatusAction(form.code, "ACTIVE"),
                        )
                      }
                      type="button"
                    >
                      <Upload aria-hidden="true" height={18} width={18} />
                      Опубликовать
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <CertificateFormDrawer
        form={editing}
        onClose={() => setIsEditorOpen(false)}
        onSaved={setMessage}
        open={isEditorOpen}
      />
      <ConfirmDialog
        confirmLabel="В архив"
        onCancel={() => setArchiving(null)}
        onConfirm={() => {
          const form = archiving;
          setArchiving(null);
          if (form) {
            void run(form.code, () =>
              setCertificateFormStatusAction(form.code, "ARCHIVED"),
            );
          }
        }}
        open={archiving !== null}
        title="Перенести в архив?"
      >
        <p>
          Студенты больше не смогут заказать «{archiving?.title}». Поданные
          заявки и их данные сохранятся.
        </p>
      </ConfirmDialog>
    </section>
  );
}

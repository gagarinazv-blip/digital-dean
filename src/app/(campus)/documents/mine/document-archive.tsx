"use client";

import { DateTimeStack } from "@/components/date-time-stack";
import { useActionState, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Drawer } from "@/components/ui/drawer";
import { FormField } from "@/components/ui/form-field";
import { useDirtyForm } from "@/components/ui/use-dirty-form";
import controls from "@/components/ui/controls.module.css";
import { EmptyState } from "@/components/empty-state";
import type { StudentDocumentType } from "@/generated/prisma/enums";
import type { StudentDocumentActionState } from "@/lib/student-document-action-state";
import {
  deleteStudentDocumentAction,
  renameStudentDocumentAction,
  uploadStudentDocumentAction,
} from "./actions";
import styles from "./student-documents.module.css";

const initialActionState: StudentDocumentActionState = {};

const documentTypeLabels: Record<StudentDocumentType, string> = {
  PASSPORT: "Паспорт",
  SNILS: "СНИЛС",
  INSURANCE: "Полис ОМС",
  CONTRACT: "Договор",
  REFERENCE: "Справка",
  OTHER: "Другое",
};

type StudentDocumentRecord = {
  id: number;
  title: string;
  documentType: StudentDocumentType;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};

function ActionFeedback({ state }: { state: StudentDocumentActionState }) {
  return (
    <>
      {state.error ? (
        <p className={styles.feedbackError} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p aria-live="polite" className={styles.feedbackSuccess} role="status">
          {state.success}
        </p>
      ) : null}
    </>
  );
}

export function UploadDocumentDialog({ buttonLabel }: { buttonLabel: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (previousState: StudentDocumentActionState, formData: FormData) => {
      const nextState = await uploadStudentDocumentAction(
        previousState,
        formData,
      );
      if (nextState.success) {
        setOpen(false);
        router.refresh();
      }
      return nextState;
    },
    initialActionState,
  );
  const formId = useId();
  const { formRef, isDirty, checkDirty } = useDirtyForm();

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={controls.primary}
        onClick={() => setOpen(true)}
        type="button"
      >
        {buttonLabel}
      </button>
      <Drawer
        description="PDF, JPG или PNG размером не более 10 МБ."
        eyebrow="Мои документы"
        footer={(requestClose) => (
          <>
            <button
              className={controls.secondary}
              disabled={pending}
              onClick={requestClose}
              type="button"
            >
              Отмена
            </button>
            <button
              aria-busy={pending}
              className={controls.primary}
              disabled={pending}
              form={formId}
              type="submit"
            >
              {pending ? "Загружается…" : "Загрузить"}
            </button>
          </>
        )}
        isBusy={pending}
        isDirty={isDirty}
        onClose={() => setOpen(false)}
        open={open}
        title="Загрузить документ"
      >
        <form
          action={formAction}
          className={styles.uploadForm}
          id={formId}
          onChange={checkDirty}
          onReset={(event) => event.preventDefault()}
          ref={formRef}
        >
          <ActionFeedback state={state} />
          <FormField label="Название" required>
            {(control) => (
              <input
                {...control}
                autoComplete="off"
                data-autofocus=""
                maxLength={120}
                name="title"
                required
              />
            )}
          </FormField>
          <FormField label="Тип документа">
            {(control) => (
              <select {...control} defaultValue="OTHER" name="documentType">
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="Файл" required>
            {(control) => (
              <input
                {...control}
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                name="file"
                required
                type="file"
              />
            )}
          </FormField>
        </form>
      </Drawer>
      {state.success ? (
        <p aria-live="polite" className={styles.feedbackSuccess} role="status">
          {state.success}
        </p>
      ) : null}
    </>
  );
}

function DocumentActions({
  document,
  onActionSuccess,
}: {
  document: StudentDocumentRecord;
  onActionSuccess: (message: string) => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const [renameState, renameAction, renamePending] = useActionState(
    async (previousState: StudentDocumentActionState, formData: FormData) => {
      const nextState = await renameStudentDocumentAction(
        previousState,
        formData,
      );
      if (nextState.success) {
        setRenameOpen(false);
        onActionSuccess(nextState.success);
        router.refresh();
      }
      return nextState;
    },
    initialActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    async (previousState: StudentDocumentActionState, formData: FormData) => {
      const nextState = await deleteStudentDocumentAction(
        previousState,
        formData,
      );
      if (nextState.success) {
        setDeleteOpen(false);
        onActionSuccess(nextState.success);
        router.refresh();
      }
      return nextState;
    },
    initialActionState,
  );
  const renameFormId = useId();
  const { formRef, isDirty, checkDirty } = useDirtyForm();

  return (
    <details className={styles.actionMenu}>
      <summary>Действия</summary>
      <div className={styles.menuItems}>
        <button
          aria-haspopup="dialog"
          className={controls.secondary}
          onClick={() => setRenameOpen(true)}
          type="button"
        >
          Переименовать
        </button>
        <Drawer
          eyebrow="Мои документы"
          footer={(requestClose) => (
            <>
              <button
                className={controls.secondary}
                disabled={renamePending}
                onClick={requestClose}
                type="button"
              >
                Отмена
              </button>
              <button
                aria-busy={renamePending}
                className={controls.primary}
                disabled={renamePending}
                form={renameFormId}
                type="submit"
              >
                {renamePending ? "Сохраняется…" : "Сохранить"}
              </button>
            </>
          )}
          isBusy={renamePending}
          isDirty={isDirty}
          onClose={() => setRenameOpen(false)}
          open={renameOpen}
          title="Переименовать документ"
        >
          <form
            action={renameAction}
            className={styles.uploadForm}
            id={renameFormId}
            onChange={checkDirty}
            onReset={(event) => event.preventDefault()}
            ref={formRef}
          >
            <input name="id" type="hidden" value={document.id} />
            <ActionFeedback state={renameState} />
            <FormField label="Новое название" required>
              {(control) => (
                <input
                  {...control}
                  autoComplete="off"
                  data-autofocus=""
                  defaultValue={document.title}
                  maxLength={120}
                  name="title"
                  required
                />
              )}
            </FormField>
          </form>
        </Drawer>
        <ConfirmationDialog
          buttonClassName={styles.dangerButton}
          buttonLabel="Удалить"
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
          title="Удалить документ?"
        >
          <div className={styles.dialogContent}>
            <p>Файл «{document.title}» будет удалён из личного архива.</p>
            <form action={deleteAction}>
              <input name="id" type="hidden" value={document.id} />
              <ActionFeedback state={deleteState} />
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setDeleteOpen(false)}
                  type="button"
                >
                  Отмена
                </button>
                <button
                  className={styles.dangerButton}
                  disabled={deletePending}
                  type="submit"
                >
                  {deletePending ? "Удаляем…" : "Удалить"}
                </button>
              </div>
            </form>
          </div>
        </ConfirmationDialog>
      </div>
    </details>
  );
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
  }
  return `${Math.max(1, Math.round(size / 1024))} КБ`;
}

export function StudentDocumentArchive({
  documents,
}: {
  documents: StudentDocumentRecord[];
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [sort, setSort] = useState("NEWEST");
  const [announcement, setAnnouncement] = useState("");
  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("ru");
    const result = documents.filter((document) => {
      const matchesSearch = document.title
        .toLocaleLowerCase("ru")
        .includes(normalizedSearch);
      return matchesSearch && (type === "ALL" || document.documentType === type);
    });

    return result.sort((left, right) =>
      sort === "NAME"
        ? left.title.localeCompare(right.title, "ru")
        : right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }, [documents, search, sort, type]);

  if (documents.length === 0) {
    return (
      <div className={styles.archive}>
        <EmptyState
          action={
            <UploadDocumentDialog buttonLabel="Загрузить первый документ" />
          }
          description="Здесь хранятся сканы ваших документов, которые могут понадобиться при оформлении заявок."
          illustration="documents"
          title="Личных документов пока нет"
        />
      </div>
    );
  }

  return (
    <section aria-label="Архив личных документов" className={styles.archive}>
      {announcement ? (
        <p aria-live="polite" className={styles.feedbackSuccess} role="status">
          {announcement}
        </p>
      ) : null}
      <div aria-label="Фильтры документов" className={styles.filters} role="search">
        <label className={styles.filterField}>
          Поиск по названию
          <input
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Например, СНИЛС"
            type="search"
            value={search}
          />
        </label>
        <label className={styles.filterField}>
          Тип документа
          <select onChange={(event) => setType(event.currentTarget.value)} value={type}>
            <option value="ALL">Все типы</option>
            {Object.entries(documentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          Сортировка
          <select onChange={(event) => setSort(event.currentTarget.value)} value={sort}>
            <option value="NEWEST">Новые сверху</option>
            <option value="NAME">По названию</option>
          </select>
        </label>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          action={
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setSearch("");
                setType("ALL");
              }}
              type="button"
            >
              Сбросить фильтры
            </button>
          }
          description="Измените поисковый запрос или выберите другой тип документа."
          illustration="search"
          title="Документы не найдены"
        />
      ) : (
        <ul className={styles.list}>
          {filteredDocuments.map((document) => (
            <li className={styles.card} key={document.id}>
              <span aria-hidden="true" className={styles.fileIcon}>
                {document.mimeType === "application/pdf" ? "PDF" : "IMG"}
              </span>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>{document.title}</h2>
                <span className={styles.badge}>
                  {documentTypeLabels[document.documentType]}
                </span>
                <div className={styles.metadata}>
                  <DateTimeStack value={document.createdAt} />
                  <span>Размер: {formatFileSize(document.size)}</span>
                  <span className={styles.originalName}>
                    {document.originalName}
                  </span>
                </div>
              </div>
              <div className={styles.cardActions}>
                <a
                  className={styles.textLink}
                  href={`/files/student-documents/${document.id}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Открыть
                </a>
                <a
                  className={styles.textLink}
                  href={`/files/student-documents/${document.id}?download=1`}
                >
                  Скачать
                </a>
                <DocumentActions
                  document={document}
                  onActionSuccess={setAnnouncement}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

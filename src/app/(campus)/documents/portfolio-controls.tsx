"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import type { PortfolioSource } from "@/generated/prisma/enums";
import {
  PortfolioUploadForm,
  type PortfolioEditableItem,
} from "./portfolio-upload-form";
import styles from "./portfolio.module.css";

type Item = PortfolioEditableItem & {
  source: PortfolioSource;
};

type Props = {
  item: Item;
  isStaff: boolean;
  isManager: boolean;
  folders: { id: number; name: string }[];
};

type ActionResponse = { error?: unknown; message?: unknown };

async function postPortfolioAction(
  body: Record<string, unknown>,
): Promise<ActionResponse> {
  const response = await fetch("/api/portfolio/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let result: ActionResponse = {};
  try {
    result = (await response.json()) as ActionResponse;
  } catch {
    result = {};
  }
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Не удалось выполнить действие.",
    );
  }
  return result;
}

export function PortfolioItemControls({
  item,
  isStaff,
  isManager,
  folders,
}: Props) {
  const router = useRouter();
  const [folderId, setFolderId] = useState(
    item.folderId ? String(item.folderId) : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canEdit = isStaff
    ? item.source === "STAFF"
    : item.source === "STUDENT";
  const canDelete = isStaff
    ? item.source === "STAFF" || (isManager && item.source === "STUDENT")
    : item.source === "STUDENT";

  async function moveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await postPortfolioAction({
        action: "move-item",
        itemId: item.id,
        folderId: folderId || null,
      });
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось переместить запись.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deleteItem() {
    setPending(true);
    setError("");
    try {
      await postPortfolioAction({ action: "delete-item", itemId: item.id });
      setDeleteOpen(false);
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось удалить запись.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.itemControls}>
      {!isStaff ? (
        <form className={styles.moveForm} onSubmit={moveItem}>
          <label>
            <span className={styles.visuallyHidden}>Переместить в папку</span>
            <select
              aria-label={`Папка для записи «${item.title}»`}
              onChange={(event) => setFolderId(event.currentTarget.value)}
              value={folderId}
            >
              <option value="">Без папки</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
          <button className={styles.secondaryButton} disabled={pending} type="submit">
            Переместить
          </button>
        </form>
      ) : null}
      {canEdit ? (
        <details className={styles.editDetails}>
          <summary className={styles.secondaryButton}>Редактировать</summary>
          <PortfolioUploadForm
            isStaff={isStaff}
            item={item}
          />
        </details>
      ) : null}
      {canDelete ? (
        <ConfirmationDialog
          buttonClassName={styles.dangerButton}
          buttonLabel="Удалить"
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
          title="Удалить запись портфолио?"
        >
          <p>Запись «{item.title}» и её файл будут удалены без возможности восстановления.</p>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
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
              disabled={pending}
              onClick={() => void deleteItem()}
              type="button"
            >
              {pending ? "Удаляем…" : "Удалить"}
            </button>
          </div>
        </ConfirmationDialog>
      ) : null}
      {error && !canDelete ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}

export function PortfolioFolderManager({
  folders,
}: {
  folders: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function sendAction(action: Record<string, unknown>) {
    setPending(true);
    setError("");
    try {
      await postPortfolioAction(action);
      setName("");
      setDeleteId(null);
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось сохранить папку.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendAction({ action: "create-folder", name });
  }

  async function submitRename(
    event: FormEvent<HTMLFormElement>,
    folderId: number,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await sendAction({
      action: "rename-folder",
      folderId,
      name: formData.get("name"),
    });
  }

  return (
    <section className={styles.folderManager} aria-labelledby="folders-title">
      <h3 id="folders-title">Ваши папки</h3>
      <form
        className={styles.folderCreate}
        onSubmit={(event) => void submitCreate(event)}
      >
        <label className={styles.visuallyHidden} htmlFor="new-portfolio-folder">
          Название папки
        </label>
        <input
          id="new-portfolio-folder"
          maxLength={60}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="Новая папка"
          value={name}
        />
        <button className={styles.secondaryButton} disabled={pending || !name.trim()} type="submit">
          Создать папку
        </button>
      </form>
      {folders.map((folder) => (
        <div className={styles.folderEdit} key={folder.id}>
          <form
            onSubmit={(event) => void submitRename(event, folder.id)}
          >
            <label className={styles.visuallyHidden} htmlFor={`folder-${folder.id}`}>
              Новое название папки «{folder.name}»
            </label>
            <input
              id={`folder-${folder.id}`}
              defaultValue={folder.name}
              maxLength={60}
              name="name"
            />
            <button className={styles.secondaryButton} disabled={pending} type="submit">
              Переименовать
            </button>
          </form>
          <ConfirmationDialog
            buttonClassName={styles.dangerButton}
            buttonLabel="Удалить папку"
            onOpenChange={(open) => setDeleteId(open ? folder.id : null)}
            open={deleteId === folder.id}
            title="Удалить папку?"
          >
            <p>Записи останутся в портфолио и будут перемещены в «Без папки».</p>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <div className={styles.dialogActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setDeleteId(null)}
                type="button"
              >
                Отмена
              </button>
              <button
                className={styles.dangerButton}
                disabled={pending}
                onClick={() =>
                  void sendAction({
                    action: "delete-folder",
                    folderId: folder.id,
                  })
                }
                type="button"
              >
                {pending ? "Удаляем…" : "Удалить"}
              </button>
            </div>
          </ConfirmationDialog>
        </div>
      ))}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}

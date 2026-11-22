"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  portfolioCategories,
  portfolioCategoryLabels,
  type PortfolioCategory,
} from "@/lib/portfolio-constants";
import styles from "./portfolio.module.css";

export type PortfolioEditableItem = {
  id: number;
  folderId?: number | null;
  title: string;
  category: PortfolioCategory;
  eventName: string | null;
  eventDate: Date | null;
  role: string | null;
  description: string | null;
};

type Props = {
  isStaff: boolean;
  folders?: { id: number; name: string }[];
  studentId?: number;
  item?: PortfolioEditableItem;
};

type UploadResponse = {
  error?: unknown;
  message?: unknown;
};

export function PortfolioUploadForm({
  isStaff,
  folders = [],
  studentId,
  item,
}: Props) {
  const router = useRouter();
  const id = useId();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setProgress(0);
    setMessage("");
    setError("");

    const request = new XMLHttpRequest();
    request.open(
      item ? "PUT" : "POST",
      item ? `/api/portfolio/items/${item.id}` : "/api/portfolio/items",
    );
    request.upload.addEventListener("progress", (uploadEvent) => {
      if (uploadEvent.lengthComputable) {
        setProgress(Math.round((uploadEvent.loaded / uploadEvent.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      let response: UploadResponse = {};
      try {
        response = JSON.parse(request.responseText) as UploadResponse;
      } catch {
        response = {};
      }
      if (request.status >= 200 && request.status < 300) {
        setMessage(
          typeof response.message === "string"
            ? response.message
            : "Достижение сохранено.",
        );
        setPending(false);
        router.refresh();
        return;
      }
      setError(
        typeof response.error === "string"
          ? response.error
          : "Не удалось загрузить файл. Попробуйте ещё раз.",
      );
      setPending(false);
    });
    request.addEventListener("error", () => {
      setError("Не удалось связаться с сервером. Проверьте соединение.");
      setPending(false);
    });
    request.send(new FormData(event.currentTarget));
  }

  const describedBy = `${id}-status`;

  return (
    <form className={styles.uploadForm} onSubmit={submit}>
      {isStaff && studentId ? (
        <input name="studentId" type="hidden" value={studentId} />
      ) : null}
      <label className={styles.field}>
        <span>Название достижения *</span>
        <input
          aria-describedby={describedBy}
          maxLength={120}
          name="title"
          required
          defaultValue={item?.title}
        />
      </label>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Категория{isStaff ? " *" : ""}</span>
          <select
            aria-describedby={describedBy}
            defaultValue={item?.category ?? "OTHER"}
            name="category"
            required={isStaff}
          >
            {portfolioCategories.map((category) => (
              <option key={category} value={category}>
                {portfolioCategoryLabels[category]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Мероприятие</span>
          <input
            aria-describedby={describedBy}
            maxLength={180}
            name="eventName"
            defaultValue={item?.eventName ?? ""}
          />
        </label>
        <label className={styles.field}>
          <span>Дата мероприятия</span>
          <input
            aria-describedby={describedBy}
            name="eventDate"
            type="date"
            defaultValue={item?.eventDate?.toISOString().slice(0, 10) ?? ""}
          />
        </label>
        <label className={styles.field}>
          <span>Роль</span>
          <input
            aria-describedby={describedBy}
            maxLength={100}
            name="role"
            placeholder="Участник, призёр, организатор…"
            defaultValue={item?.role ?? ""}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span>Описание</span>
        <textarea
          aria-describedby={describedBy}
          maxLength={500}
          name="description"
          rows={3}
          defaultValue={item?.description ?? ""}
        />
      </label>
      {folders.length > 0 && !isStaff && !item ? (
        <label className={styles.field}>
          <span>Папка</span>
          <select aria-describedby={describedBy} name="folderId" defaultValue="">
            <option value="">Без папки</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className={styles.field}>
        <span>Файл {item ? "(необязательно заменить)" : "*"}</span>
        <input
          aria-describedby={describedBy}
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          name="file"
          required={!item}
          type="file"
        />
        <small>PDF, JPG или PNG · до 10 МБ</small>
      </label>
      <div aria-live="polite" className={styles.uploadStatus} id={describedBy}>
        {pending ? (
          <>
            <span>Загрузка: {progress}%</span>
            <progress max={100} value={progress} />
          </>
        ) : null}
        {message ? <span>{message}</span> : null}
        {error ? <span className={styles.error} role="alert">{error}</span> : null}
      </div>
      <button className={styles.primaryButton} disabled={pending} type="submit">
        {pending
          ? "Сохраняем…"
          : item
            ? "Сохранить изменения"
            : "Добавить достижение"}
      </button>
    </form>
  );
}

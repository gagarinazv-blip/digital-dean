"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import { FormField } from "@/components/ui/form-field";
import { useDirtyForm } from "@/components/ui/use-dirty-form";
import controls from "@/components/ui/controls.module.css";
import {
  portfolioCategories,
  portfolioCategoryLabels,
  type PortfolioCategory,
} from "@/lib/portfolio-constants";
import {
  checkPortfolioFile,
  PORTFOLIO_FILE_ACCEPT,
  validatePortfolioMetadata,
  type PortfolioFieldErrors,
  type PortfolioFormField,
} from "@/lib/portfolio-form";
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
  studentName?: string;
  item?: PortfolioEditableItem;
  triggerLabel: string;
  triggerClassName?: string;
};

type SaveResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors: PortfolioFieldErrors };

const networkError =
  "Не удалось связаться с сервером. Данные в форме сохранены — попробуйте ещё раз.";

function parseResponse(request: XMLHttpRequest): SaveResult {
  let body: { error?: unknown; message?: unknown; fieldErrors?: unknown } = {};
  try {
    body = JSON.parse(request.responseText);
  } catch {
    body = {};
  }
  if (request.status >= 200 && request.status < 300) {
    return {
      ok: true,
      message:
        typeof body.message === "string" ? body.message : "Достижение сохранено.",
    };
  }
  return {
    ok: false,
    error:
      typeof body.error === "string"
        ? body.error
        : "Не удалось сохранить достижение. Попробуйте ещё раз.",
    fieldErrors:
      typeof body.fieldErrors === "object" && body.fieldErrors !== null
        ? (body.fieldErrors as PortfolioFieldErrors)
        : {},
  };
}

function sendForm(
  method: string,
  url: string,
  data: FormData,
  onProgress: (percent: number) => void,
): Promise<SaveResult> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    const fail = () =>
      resolve({ ok: false, error: networkError, fieldErrors: {} });
    request.open(method, url);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => resolve(parseResponse(request)));
    request.addEventListener("error", fail);
    request.addEventListener("abort", fail);
    request.send(data);
  });
}

export function PortfolioItemDrawer({
  isStaff,
  folders = [],
  studentId,
  studentName,
  item,
  triggerLabel,
  triggerClassName = controls.primary,
}: Props) {
  const router = useRouter();
  const formId = useId();
  const isSubmittingRef = useRef(false);
  const { formRef, formElementRef, isDirty, checkDirty } = useDirtyForm();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<PortfolioFieldErrors>({});
  const [successMessage, setSuccessMessage] = useState("");

  function show() {
    setError("");
    setFieldErrors({});
    setSuccessMessage("");
    setOpen(true);
  }

  function showErrors(errors: PortfolioFieldErrors, message: string) {
    setFieldErrors(errors);
    setError(message);
  }

  // Поля снова доступны только после сохранения, поэтому фокус ставим здесь.
  useEffect(() => {
    if (!open || pending || !error) return;
    const form = formElementRef.current;
    const firstInvalid = form?.querySelector<HTMLElement>("[aria-invalid=true]");
    (firstInvalid ?? form?.querySelector<HTMLElement>("[role=alert]"))?.focus();
  }, [error, formElementRef, open, pending]);

  async function validate(data: FormData): Promise<PortfolioFieldErrors> {
    const metadata = validatePortfolioMetadata(
      Object.fromEntries(data.entries()),
      isStaff || Boolean(item),
    );
    const errors: PortfolioFieldErrors = metadata.ok ? {} : metadata.errors;
    const file = data.get("file");
    if (file instanceof File && file.size > 0) {
      const fileError = await checkPortfolioFile(file);
      if (fileError) errors.file = fileError;
    } else if (file instanceof File && file.name) {
      errors.file = "Файл пустой. Выберите другой файл.";
    } else if (!item) {
      errors.file = "Выберите файл PDF, JPG или PNG.";
    }
    return errors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setProgress(0);
    setError("");

    try {
      const errors = await validate(data);
      if (Object.keys(errors).length > 0) {
        showErrors(errors, "Проверьте выделенные поля.");
        return;
      }
      setFieldErrors({});
      const result = await sendForm(
        item ? "PUT" : "POST",
        item ? `/api/portfolio/items/${item.id}` : "/api/portfolio/items",
        data,
        setProgress,
      );
      if (!result.ok) {
        showErrors(result.fieldErrors, result.error);
        return;
      }
      setSuccessMessage(result.message);
      setOpen(false);
      router.refresh();
    } catch {
      showErrors({}, networkError);
    } finally {
      isSubmittingRef.current = false;
      setPending(false);
    }
  }

  function handleChange(event: FormEvent<HTMLFormElement>) {
    checkDirty();
    const { name } = event.target as HTMLInputElement;
    if (fieldErrors[name as PortfolioFormField]) {
      setFieldErrors((current) => ({ ...current, [name]: undefined }));
    }
  }

  return (
    <div className={styles.drawerTrigger}>
      <button
        aria-haspopup="dialog"
        className={triggerClassName}
        onClick={show}
        type="button"
      >
        {triggerLabel}
      </button>
      {successMessage ? (
        <p className={styles.saved} role="status">
          {successMessage}
        </p>
      ) : null}
      <Drawer
        description={
          studentName
            ? `Студент: ${studentName}`
            : "Поля со звёздочкой обязательны."
        }
        eyebrow="Портфолио"
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
              {pending ? "Сохраняется…" : "Сохранить"}
            </button>
          </>
        )}
        isBusy={pending}
        isDirty={isDirty}
        onClose={() => setOpen(false)}
        open={open}
        title={item ? "Редактирование достижения" : "Новое достижение"}
      >
        <form
          aria-busy={pending}
          className={styles.itemForm}
          id={formId}
          noValidate
          onChange={handleChange}
          onSubmit={(event) => void submit(event)}
          ref={formRef}
        >
          {error ? (
            <p className={controls.alert} role="alert" tabIndex={-1}>
              {error}
            </p>
          ) : null}
          {isStaff && studentId ? (
            <input name="studentId" type="hidden" value={studentId} />
          ) : null}
          <fieldset className={styles.itemFields} disabled={pending}>
            <legend className={controls.visuallyHidden}>Данные достижения</legend>
            <FormField
              error={fieldErrors.title}
              label="Название достижения"
              required
            >
              {(control) => (
                <input
                  {...control}
                  autoComplete="off"
                  data-autofocus=""
                  defaultValue={item?.title}
                  maxLength={120}
                  name="title"
                />
              )}
            </FormField>
            <div className={styles.formGrid}>
              <FormField error={fieldErrors.category} label="Категория" required>
                {(control) => (
                  <select
                    {...control}
                    defaultValue={item?.category ?? "OTHER"}
                    name="category"
                  >
                    {portfolioCategories.map((category) => (
                      <option key={category} value={category}>
                        {portfolioCategoryLabels[category]}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
              <FormField error={fieldErrors.eventDate} label="Дата мероприятия">
                {(control) => (
                  <input
                    {...control}
                    defaultValue={
                      item?.eventDate?.toISOString().slice(0, 10) ?? ""
                    }
                    max="2099-12-31"
                    min="1900-01-01"
                    name="eventDate"
                    type="date"
                  />
                )}
              </FormField>
            </div>
            <FormField error={fieldErrors.eventName} label="Мероприятие">
              {(control) => (
                <input
                  {...control}
                  defaultValue={item?.eventName ?? ""}
                  maxLength={180}
                  name="eventName"
                />
              )}
            </FormField>
            <FormField
              error={fieldErrors.role}
              hint="Например: участник, призёр, организатор."
              label="Роль"
            >
              {(control) => (
                <input
                  {...control}
                  defaultValue={item?.role ?? ""}
                  maxLength={100}
                  name="role"
                />
              )}
            </FormField>
            <FormField
              error={fieldErrors.description}
              hint="До 500 символов."
              label="Описание"
            >
              {(control) => (
                <textarea
                  {...control}
                  defaultValue={item?.description ?? ""}
                  maxLength={500}
                  name="description"
                  rows={4}
                />
              )}
            </FormField>
            {folders.length > 0 && !isStaff && !item ? (
              <FormField error={fieldErrors.folderId} label="Папка">
                {(control) => (
                  <select {...control} defaultValue="" name="folderId">
                    <option value="">Без папки</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            ) : null}
            <FormField
              error={fieldErrors.file}
              hint={
                item
                  ? "PDF, JPG или PNG до 10 МБ. Оставьте пустым, чтобы сохранить текущий файл."
                  : "PDF, JPG или PNG до 10 МБ."
              }
              label={item ? "Заменить файл" : "Файл"}
              required={!item}
            >
              {(control) => (
                <input
                  {...control}
                  accept={PORTFOLIO_FILE_ACCEPT}
                  name="file"
                  type="file"
                />
              )}
            </FormField>
          </fieldset>
          <div aria-live="polite" className={styles.uploadStatus}>
            {pending && progress > 0 ? (
              <>
                <span>Загрузка: {progress}%</span>
                <progress aria-label="Загрузка файла" max={100} value={progress} />
              </>
            ) : null}
          </div>
        </form>
      </Drawer>
    </div>
  );
}

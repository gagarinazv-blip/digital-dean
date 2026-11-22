import {
  portfolioCategories,
  type PortfolioCategory,
} from "@/lib/portfolio-constants";

// Правила формы достижения. Модуль без серверных зависимостей: одна и та же
// проверка выполняется в браузере перед отправкой и на сервере.

export const MAX_PORTFOLIO_FILE_BYTES = 10 * 1024 * 1024;
export const PORTFOLIO_FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export type PortfolioMimeType = "application/pdf" | "image/jpeg" | "image/png";

export type PortfolioMetadata = {
  title: string;
  category: PortfolioCategory;
  eventName: string | null;
  eventDate: Date | null;
  role: string | null;
  description: string | null;
};

export type PortfolioFormField = keyof PortfolioMetadata | "file" | "folderId";
export type PortfolioFieldErrors = Partial<Record<PortfolioFormField, string>>;

const extensionMimeTypes: Record<string, PortfolioMimeType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

const fileSignatures: readonly [PortfolioMimeType, readonly number[]][] = [
  ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
];

export function isPortfolioCategory(value: unknown): value is PortfolioCategory {
  return (
    typeof value === "string" &&
    portfolioCategories.some((category) => category === value)
  );
}

export function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (
    typeof value !== "string" ||
    !/^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(value)
  ) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? undefined
    : date;
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validatePortfolioMetadata(
  input: Record<string, unknown>,
  requireCategory: boolean,
):
  | { ok: true; value: PortfolioMetadata }
  | { ok: false; errors: PortfolioFieldErrors } {
  const errors: PortfolioFieldErrors = {};
  const title = getText(input.title);
  const eventName = getText(input.eventName);
  const role = getText(input.role);
  const description = getText(input.description);
  const rawCategory = input.category;
  const category =
    rawCategory === undefined || rawCategory === null || rawCategory === ""
      ? "OTHER"
      : rawCategory;
  const eventDate = parseOptionalDate(input.eventDate);

  if (!title) errors.title = "Введите название достижения.";
  else if (title.length > 120) {
    errors.title = "Название — не более 120 символов.";
  }
  if (!isPortfolioCategory(category) || (requireCategory && !rawCategory)) {
    errors.category = "Выберите категорию достижения.";
  }
  if (eventName.length > 180) {
    errors.eventName = "Название мероприятия — не более 180 символов.";
  }
  if (eventDate === undefined) {
    errors.eventDate = "Укажите корректную дату мероприятия.";
  }
  if (role.length > 100) errors.role = "Роль — не более 100 символов.";
  if (description.length > 500) {
    errors.description = "Описание — не более 500 символов.";
  }

  if (
    Object.keys(errors).length > 0 ||
    !isPortfolioCategory(category) ||
    eventDate === undefined
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title,
      category,
      eventName: eventName || null,
      eventDate,
      role: role || null,
      description: description || null,
    },
  };
}

export function getPortfolioFileMimeType(
  upload: Pick<File, "name" | "type">,
): PortfolioMimeType | null {
  const extension = upload.name.split(".").at(-1)?.toLowerCase() ?? "";
  const expected = extensionMimeTypes[extension];
  const received = upload.type.toLowerCase().split(";")[0];
  return expected && received === expected ? expected : null;
}

export function getPortfolioFileError(
  upload: Pick<File, "name" | "size" | "type">,
): string | null {
  if (upload.size < 1 || upload.size > MAX_PORTFOLIO_FILE_BYTES) {
    return "Размер файла должен быть от 1 байта до 10 МБ.";
  }
  return getPortfolioFileMimeType(upload)
    ? null
    : "Разрешены только PDF, JPG и PNG с соответствующим расширением.";
}

export function detectPortfolioFileType(
  data: Uint8Array,
): PortfolioMimeType | null {
  return (
    fileSignatures.find(([, signature]) =>
      signature.every((byte, index) => data[index] === byte),
    )?.[0] ?? null
  );
}

export async function checkPortfolioFile(upload: File): Promise<string | null> {
  const error = getPortfolioFileError(upload);
  if (error) return error;
  const head = new Uint8Array(await upload.slice(0, 8).arrayBuffer());
  return detectPortfolioFileType(head) === getPortfolioFileMimeType(upload)
    ? null
    : "Содержимое файла не соответствует его типу.";
}

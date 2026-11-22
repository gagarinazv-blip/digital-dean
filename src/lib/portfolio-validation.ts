import { Buffer } from "node:buffer";
import type { StoredFileExtension } from "@/lib/file-storage";
import {
  portfolioCategories,
  type PortfolioCategory,
} from "@/lib/portfolio-constants";

export const MAX_PORTFOLIO_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PORTFOLIO_ITEMS = 200;
export const MAX_PORTFOLIO_STORAGE_BYTES = 200 * 1024 * 1024;
export const PORTFOLIO_UPLOADS_PER_HOUR = 20;

export type PreparedPortfolioFile = {
  data: Buffer;
  extension: StoredFileExtension;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  originalName: string;
  size: number;
};

export type PortfolioFileValidation =
  | { ok: true; file: PreparedPortfolioFile }
  | { ok: false; error: string };

export type PortfolioMetadata = {
  title: string;
  category: PortfolioCategory;
  eventName: string | null;
  eventDate: Date | null;
  role: string | null;
  description: string | null;
};

const extensionMimeTypes: Record<
  string,
  PreparedPortfolioFile["mimeType"]
> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function detectFileType(data: Buffer): PreparedPortfolioFile["mimeType"] | null {
  if (data.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data.subarray(1, 4).toString("ascii") === "PNG" &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

function sanitizeOriginalName(
  name: string,
  mimeType: PreparedPortfolioFile["mimeType"],
): string {
  const basename = name.replace(/\\/g, "/").split("/").pop() ?? "";
  const stem = basename
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 240);
  const extension = mimeType === "application/pdf"
    ? "pdf"
    : mimeType === "image/jpeg"
      ? "jpg"
      : "png";
  return `${stem || "portfolio-document"}.${extension}`.slice(0, 255);
}

export async function validatePortfolioUpload(
  upload: File,
): Promise<PortfolioFileValidation> {
  if (upload.size < 1 || upload.size > MAX_PORTFOLIO_FILE_BYTES) {
    return {
      ok: false,
      error: "Размер файла должен быть от 1 байта до 10 МБ.",
    };
  }

  const basename = upload.name.replace(/\\/g, "/").split("/").pop() ?? "";
  const extension = basename.split(".").at(-1)?.toLowerCase() ?? "";
  const expectedMimeType = extensionMimeTypes[extension];
  const receivedMimeType = upload.type.toLowerCase().split(";")[0];
  if (!expectedMimeType || receivedMimeType !== expectedMimeType) {
    return {
      ok: false,
      error: "Разрешены только PDF, JPG и PNG с соответствующим расширением.",
    };
  }

  const data = Buffer.from(await upload.arrayBuffer());
  if (data.length !== upload.size || detectFileType(data) !== expectedMimeType) {
    return {
      ok: false,
      error: "Содержимое файла не соответствует его типу.",
    };
  }

  const storedExtension: StoredFileExtension =
    expectedMimeType === "application/pdf"
      ? "pdf"
      : expectedMimeType === "image/jpeg"
        ? "jpg"
        : "png";
  return {
    ok: true,
    file: {
      data,
      extension: storedExtension,
      mimeType: expectedMimeType,
      originalName: sanitizeOriginalName(basename, expectedMimeType),
      size: data.length,
    },
  };
}

export function isPortfolioCategory(value: unknown): value is PortfolioCategory {
  return (
    typeof value === "string" &&
    portfolioCategories.some((category) => category === value)
  );
}

export function parsePortfolioMetadata(
  input: Record<string, unknown>,
  requireCategory: boolean,
): { ok: true; value: PortfolioMetadata } | { ok: false; error: string } {
  const title =
    typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 120) {
    return { ok: false, error: "Название обязательно (до 120 символов)." };
  }

  const rawCategory = input.category;
  const category =
    rawCategory === undefined || rawCategory === null || rawCategory === ""
      ? "OTHER"
      : rawCategory;
  if (!isPortfolioCategory(category) || (requireCategory && !rawCategory)) {
    return { ok: false, error: "Выберите категорию достижения." };
  }

  const eventName =
    typeof input.eventName === "string" ? input.eventName.trim() : "";
  const role = typeof input.role === "string" ? input.role.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (eventName.length > 180) {
    return { ok: false, error: "Название мероприятия — не более 180 символов." };
  }
  if (role.length > 100) {
    return { ok: false, error: "Роль — не более 100 символов." };
  }
  if (description.length > 500) {
    return { ok: false, error: "Описание — не более 500 символов." };
  }

  const eventDate = parseOptionalDate(input.eventDate);
  if (eventDate === undefined) {
    return { ok: false, error: "Укажите корректную дату мероприятия." };
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

export function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? undefined
    : date;
}

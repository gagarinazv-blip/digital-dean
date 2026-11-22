import { Buffer } from "node:buffer";
import type { StoredFileExtension } from "@/lib/file-storage";
import {
  detectPortfolioFileType,
  getPortfolioFileError,
  getPortfolioFileMimeType,
  type PortfolioMimeType,
} from "@/lib/portfolio-form";

export {
  isPortfolioCategory,
  MAX_PORTFOLIO_FILE_BYTES,
  validatePortfolioMetadata,
  type PortfolioMetadata,
} from "@/lib/portfolio-form";

export const MAX_PORTFOLIO_ITEMS = 200;
export const MAX_PORTFOLIO_STORAGE_BYTES = 200 * 1024 * 1024;
export const PORTFOLIO_UPLOADS_PER_HOUR = 20;

export type PreparedPortfolioFile = {
  data: Buffer;
  extension: StoredFileExtension;
  mimeType: PortfolioMimeType;
  originalName: string;
  size: number;
};

export type PortfolioFileValidation =
  | { ok: true; file: PreparedPortfolioFile }
  | { ok: false; error: string };

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
  const error = getPortfolioFileError(upload);
  const expectedMimeType = getPortfolioFileMimeType(upload);
  if (error || !expectedMimeType) {
    return { ok: false, error: error ?? "Выберите файл PDF, JPG или PNG." };
  }

  const data = Buffer.from(await upload.arrayBuffer());
  if (
    data.length !== upload.size ||
    detectPortfolioFileType(data) !== expectedMimeType
  ) {
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
      originalName: sanitizeOriginalName(upload.name, expectedMimeType),
      size: data.length,
    },
  };
}

import { Buffer } from "node:buffer";
import type { StoredFileExtension } from "@/lib/file-storage";

export const MAX_OPPORTUNITY_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_OPPORTUNITY_APPLICATION_BYTES = 25 * 1024 * 1024;
export const MAX_OPPORTUNITY_FILES_PER_SLOT = 3;

export type PreparedOpportunityFile = {
  data: Buffer;
  extension: StoredFileExtension;
  mimeType: string;
  originalName: string;
  size: number;
};

export type OpportunityFileValidation =
  | { ok: true; file: PreparedOpportunityFile }
  | { ok: false; error: string };

const fileTypes: Record<string, { extension: StoredFileExtension; mimeType: string }> = {
  pdf: { extension: "pdf", mimeType: "application/pdf" },
  jpg: { extension: "jpg", mimeType: "image/jpeg" },
  jpeg: { extension: "jpg", mimeType: "image/jpeg" },
  png: { extension: "png", mimeType: "image/png" },
  doc: { extension: "doc", mimeType: "application/msword" },
  docx: {
    extension: "docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
};

function matchesSignature(data: Buffer, extension: StoredFileExtension): boolean {
  if (extension === "pdf") return data.subarray(0, 5).toString("ascii") === "%PDF-";
  if (extension === "jpg") {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (extension === "png") {
    return (
      data.length >= 8 &&
      data.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
    );
  }
  if (extension === "doc") {
    return data.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1";
  }
  return data.length >= 4 && data.subarray(0, 4).toString("hex") === "504b0304";
}

function safeOriginalName(name: string, extension: StoredFileExtension): string {
  const basename = name.replace(/\\/g, "/").split("/").pop() ?? "";
  const stem = basename
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 240);
  return `${stem || "application-file"}.${extension}`.slice(0, 255);
}

export async function validateOpportunityFile(
  upload: File,
): Promise<OpportunityFileValidation> {
  if (upload.size < 1 || upload.size > MAX_OPPORTUNITY_FILE_BYTES) {
    return { ok: false, error: "Размер каждого файла не должен превышать 10 МБ." };
  }
  const basename = upload.name.replace(/\\/g, "/").split("/").pop() ?? "";
  const extension = basename.split(".").at(-1)?.toLowerCase() ?? "";
  const expected = fileTypes[extension];
  if (!expected || upload.type.toLowerCase().split(";")[0] !== expected.mimeType) {
    return {
      ok: false,
      error: "Разрешены только PDF, DOC, DOCX, JPG и PNG с корректным MIME-типом.",
    };
  }
  const data = Buffer.from(await upload.arrayBuffer());
  if (data.length !== upload.size || !matchesSignature(data, expected.extension)) {
    return { ok: false, error: "Содержимое файла не соответствует его типу." };
  }
  return {
    ok: true,
    file: {
      data,
      extension: expected.extension,
      mimeType: expected.mimeType,
      originalName: safeOriginalName(upload.name, expected.extension),
      size: data.length,
    },
  };
}

export function validateStoredOpportunityFile(
  name: string,
  mimeType: string,
  data: Buffer,
): OpportunityFileValidation {
  const basename = name.replace(/\\/g, "/").split("/").pop() ?? "";
  const extension = basename.split(".").at(-1)?.toLowerCase() ?? "";
  const expected = fileTypes[extension];
  if (
    !expected ||
    expected.mimeType !== mimeType ||
    data.length < 1 ||
    data.length > MAX_OPPORTUNITY_FILE_BYTES ||
    !matchesSignature(data, expected.extension)
  ) {
    return { ok: false, error: "Выбранный архивный файл имеет неподдерживаемый тип или размер." };
  }
  return {
    ok: true,
    file: {
      data,
      extension: expected.extension,
      mimeType: expected.mimeType,
      originalName: safeOriginalName(basename, expected.extension),
      size: data.length,
    },
  };
}

export function inferOpportunityFileType(
  name: string,
  mimeType: string,
): { extension: StoredFileExtension; mimeType: string } | null {
  const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
  const type = fileTypes[extension];
  if (!type || mimeType !== type.mimeType) return null;
  return type;
}

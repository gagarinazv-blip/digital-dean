import { Buffer } from "node:buffer";

export const MAX_REQUEST_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_FILES_PER_MESSAGE = 5;

export type PreparedRequestAttachment = {
  fileName: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png";
  sizeBytes: number;
  data: Uint8Array<ArrayBuffer>;
};

export type RequestUploadValidation =
  | { ok: true; files: PreparedRequestAttachment[] }
  | { ok: false; error: string };

function detectMediaType(data: Buffer): PreparedRequestAttachment["mediaType"] | null {
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

function getSafeFileName(
  name: string,
  mediaType: PreparedRequestAttachment["mediaType"],
): string {
  const basename = name.replace(/\\/g, "/").split("/").pop() ?? "";
  const stem =
    basename
      .replace(/\.[^.]*$/, "")
      .replace(/[\u0000-\u001f\u007f"]/g, "_")
      .trim()
      .slice(0, 100) || "document";
  const extension =
    mediaType === "application/pdf"
      ? "pdf"
      : mediaType === "image/jpeg"
        ? "jpg"
        : "png";

  return `${stem}.${extension}`;
}

export async function validateRequestUploads(
  values: FormDataEntryValue[],
): Promise<RequestUploadValidation> {
  const uploads: File[] = [];

  for (const value of values) {
    if (typeof value === "string") {
      if (value.length > 0) {
        return { ok: false, error: "Не удалось прочитать прикреплённый файл." };
      }
      continue;
    }

    // Next's server-action parser names an unselected file input "undefined".
    if (value.size === 0 && (value.name === "" || value.name === "undefined")) {
      continue;
    }
    uploads.push(value);
  }

  if (uploads.length > MAX_REQUEST_FILES_PER_MESSAGE) {
    return {
      ok: false,
      error: `Можно прикрепить не больше ${MAX_REQUEST_FILES_PER_MESSAGE} файлов за одно сообщение.`,
    };
  }

  const files: PreparedRequestAttachment[] = [];
  for (const upload of uploads) {
    if (upload.size < 1 || upload.size > MAX_REQUEST_FILE_BYTES) {
      return {
        ok: false,
        error: "Размер каждого файла должен быть от 1 байта до 5 МБ.",
      };
    }

    const data = Buffer.from(await upload.arrayBuffer());
    if (data.length !== upload.size) {
      return { ok: false, error: "Не удалось прочитать прикреплённый файл." };
    }

    const mediaType = detectMediaType(data);
    if (!mediaType) {
      return {
        ok: false,
        error: "Разрешены только настоящие файлы PDF, JPEG/JPG и PNG.",
      };
    }

    const storedData = new Uint8Array(data.length);
    storedData.set(data);
    files.push({
      fileName: getSafeFileName(upload.name, mediaType),
      mediaType,
      sizeBytes: data.length,
      data: storedData,
    });
  }

  return { ok: true, files };
}

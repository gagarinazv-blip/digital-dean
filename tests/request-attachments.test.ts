import { describe, expect, it } from "vitest";
import {
  MAX_REQUEST_FILE_BYTES,
  validateRequestUploads,
} from "../src/lib/request-attachments";

function makeFile(
  parts: BlobPart[],
  name: string,
  type = "application/octet-stream",
): File {
  const formData = new FormData();
  formData.append("file", new Blob(parts, { type }), name);
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    throw new Error("Could not create a test file.");
  }
  return file;
}

describe("request attachment validation", () => {
  it("detects PDF content instead of trusting the browser-supplied type", async () => {
    const file = makeFile(["%PDF-1.7\ncontent"], "..\\private.png", "image/png");
    const result = await validateRequestUploads([file]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.files[0]).toMatchObject({
        fileName: "private.pdf",
        mediaType: "application/pdf",
      });
    }
  });

  it("rejects unsupported content and files over the size limit", async () => {
    const unsupported = makeFile(["plain text"], "notes.txt");
    const tooLarge = makeFile(
      [new ArrayBuffer(MAX_REQUEST_FILE_BYTES + 1)],
      "large.pdf",
    );

    await expect(validateRequestUploads([unsupported])).resolves.toMatchObject({
      ok: false,
    });
    await expect(validateRequestUploads([tooLarge])).resolves.toMatchObject({
      ok: false,
      error: "Размер каждого файла должен быть от 1 байта до 5 МБ.",
    });
  });

  it("ignores an empty input placeholder but rejects an empty named file", async () => {
    const emptyInputPlaceholder = makeFile([], "undefined");
    const emptyNamedFile = makeFile([], "empty.pdf");

    await expect(
      validateRequestUploads([emptyInputPlaceholder]),
    ).resolves.toEqual({ ok: true, files: [] });
    await expect(validateRequestUploads([emptyNamedFile])).resolves.toMatchObject({
      ok: false,
      error: "Размер каждого файла должен быть от 1 байта до 5 МБ.",
    });
  });

  it("limits the number of files in one message", async () => {
    const files = Array.from(
      { length: 6 },
      (_, index) => makeFile(["%PDF-1.7"], `document-${index}.pdf`),
    );

    await expect(validateRequestUploads(files)).resolves.toMatchObject({
      ok: false,
      error: "Можно прикрепить не больше 5 файлов за одно сообщение.",
    });
  });
});

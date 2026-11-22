import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalFileStorage } from "../src/lib/file-storage";
import {
  MAX_PORTFOLIO_FILE_BYTES,
  validatePortfolioMetadata,
  validatePortfolioUpload,
} from "../src/lib/portfolio-validation";

const pdfBytes = new TextEncoder().encode(
  "%PDF-1.4\n1 0 obj<<>>\nendobj\ntrailer<<>>\n%%EOF\n",
);

describe("portfolio file validation and storage", () => {
  let temporaryDirectory = "";

  afterAll(async () => {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("accepts supported signature and sanitizes path-like file names", async () => {
    const upload = new File([pdfBytes], "C:\\private\\award (1).pdf", {
      type: "application/pdf",
    });

    const result = await validatePortfolioUpload(upload);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.originalName).toBe("award (1).pdf");
      expect(result.file.extension).toBe("pdf");
    }
  });

  it("rejects a renamed file whose signature does not match its extension", async () => {
    const upload = new File([pdfBytes], "award.png", { type: "image/png" });

    await expect(validatePortfolioUpload(upload)).resolves.toMatchObject({
      ok: false,
      error: "Содержимое файла не соответствует его типу.",
    });
  });

  it("rejects files larger than 10 MB", async () => {
    const upload = new File(
      [new Uint8Array(MAX_PORTFOLIO_FILE_BYTES + 1)],
      "large.pdf",
      { type: "application/pdf" },
    );

    await expect(validatePortfolioUpload(upload)).resolves.toMatchObject({
      ok: false,
    });
  });

  it("rejects invalid metadata lengths and dates", () => {
    expect(
      validatePortfolioMetadata(
        { title: "x".repeat(121), category: "SCIENCE" },
        true,
      ).ok,
    ).toBe(false);
    expect(
      validatePortfolioMetadata(
        { title: "Достижение", category: "SCIENCE", eventDate: "2025-02-30" },
        true,
      ).ok,
    ).toBe(false);
  });

  it("stores, reads, and deletes files while rejecting path traversal", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "portfolio-storage-"));
    const storage = new LocalFileStorage(temporaryDirectory);
    const storedName = await storage.save(pdfBytes, "pdf");

    await expect(storage.read(storedName)).resolves.toEqual(Buffer.from(pdfBytes));
    await expect(storage.read("../outside.pdf")).rejects.toThrow(
      "Invalid stored file name.",
    );
    await storage.delete(storedName);
    await expect(storage.read(storedName)).rejects.toThrow();
  });
});

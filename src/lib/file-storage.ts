import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export type StoredFileExtension = "pdf" | "jpg" | "png";

export interface FileStorage {
  save(data: Uint8Array, extension: StoredFileExtension): Promise<string>;
  read(storedName: string): Promise<Buffer>;
  delete(storedName: string): Promise<void>;
}

function assertSafeStoredName(storedName: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|png)$/i.test(storedName)) {
    throw new Error("Invalid stored file name.");
  }
}

export class LocalFileStorage implements FileStorage {
  private readonly directory: string;

  constructor(directory = process.env.UPLOAD_DIR ?? "./storage/uploads") {
    this.directory = resolve(/* turbopackIgnore: true */ directory);
  }

  private getPath(storedName: string): string {
    assertSafeStoredName(storedName);
    const path = resolve(this.directory, storedName);
    const relativePath = relative(this.directory, path);
    if (
      !relativePath ||
      relativePath.startsWith(`..${sep}`) ||
      relativePath === ".." ||
      relativePath.includes(sep)
    ) {
      throw new Error("Invalid stored file path.");
    }
    return path;
  }

  async save(data: Uint8Array, extension: StoredFileExtension): Promise<string> {
    const storedName = `${randomUUID()}.${extension}`;
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await writeFile(this.getPath(storedName), data, {
      flag: "wx",
      mode: 0o600,
    });
    return storedName;
  }

  async read(storedName: string): Promise<Buffer> {
    return readFile(this.getPath(storedName));
  }

  async delete(storedName: string): Promise<void> {
    await unlink(this.getPath(storedName));
  }
}

export const fileStorage = new LocalFileStorage();

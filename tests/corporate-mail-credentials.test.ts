import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decryptCorporateMailPassword,
  encryptCorporateMailPassword,
} from "../src/lib/corporate-mail-credentials";

const testKey = Buffer.from("0123456789abcdef0123456789abcdef").toString(
  "base64",
);

beforeEach(() => {
  vi.stubEnv("MAIL_CREDENTIALS_KEY", testKey);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("corporate mail password encryption", () => {
  it("encrypts and decrypts with authenticated AES-256-GCM", () => {
    const password = "Fictional-Demo-Mail-Pass-2026!";
    const encrypted = encryptCorporateMailPassword(password);

    expect(encrypted).not.toContain(password);
    expect(decryptCorporateMailPassword(encrypted)).toBe(password);
  });

  it("uses a fresh IV for each encryption", () => {
    const first = encryptCorporateMailPassword("fictional-password");
    const second = encryptCorporateMailPassword("fictional-password");

    expect(first).not.toBe(second);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptCorporateMailPassword("fictional-password");
    const parts = encrypted.split(".");
    parts[3] = `${parts[3]}x`;

    expect(() => decryptCorporateMailPassword(parts.join("."))).toThrow();
  });

  it("requires a valid 32-byte Base64 key", () => {
    vi.stubEnv("MAIL_CREDENTIALS_KEY", "not-a-valid-key");

    expect(() => encryptCorporateMailPassword("fictional-password")).toThrow(
      "MAIL_CREDENTIALS_KEY",
    );
  });
});

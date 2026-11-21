import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const algorithm = "aes-256-gcm";
const ivLength = 12;
const authTagLength = 16;

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.MAIL_CREDENTIALS_KEY?.trim();
  if (!encodedKey) {
    throw new Error("MAIL_CREDENTIALS_KEY is required.");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new Error("MAIL_CREDENTIALS_KEY must be base64 for exactly 32 bytes.");
  }

  return key;
}

function decodeBase64Url(value: string): Buffer {
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new Error("Invalid encrypted corporate mail password.");
  }
  return decoded;
}

export function encryptCorporateMailPassword(password: string): string {
  if (!password) {
    throw new Error("Corporate mail password must not be empty.");
  }

  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptCorporateMailPassword(
  encryptedPassword: string,
): string {
  const [version, encodedIv, encodedAuthTag, encodedCiphertext, extra] =
    encryptedPassword.split(".");
  if (
    version !== "v1" ||
    !encodedIv ||
    !encodedAuthTag ||
    encodedCiphertext === undefined ||
    extra !== undefined
  ) {
    throw new Error("Invalid encrypted corporate mail password.");
  }

  const iv = decodeBase64Url(encodedIv);
  const authTag = decodeBase64Url(encodedAuthTag);
  const ciphertext = decodeBase64Url(encodedCiphertext);
  if (iv.length !== ivLength || authTag.length !== authTagLength) {
    throw new Error("Invalid encrypted corporate mail password.");
  }

  const decipher = createDecipheriv(algorithm, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

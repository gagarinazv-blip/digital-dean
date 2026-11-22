export function normalizeStudentPhone(value: string): string | null {
  const input = value.trim();
  if (!input || input.length > 40) {
    return null;
  }

  const compact = input.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(compact)) {
    return null;
  }
  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  const digits = compact.replace(/\D/g, "");
  if (/^8\d{10}$/.test(digits)) {
    return `+7${digits.slice(1)}`;
  }
  if (/^7\d{10}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^\d{10}$/.test(digits)) {
    return `+7${digits}`;
  }
  return null;
}

export function formatStudentPhoneInput(value: string): string {
  const trimmed = value.trim();
  if (/[a-zа-я]/i.test(trimmed)) {
    return value;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && !digits.startsWith("7")) {
    return `+${digits.slice(0, 15)}`;
  }

  const national = (
    digits.startsWith("7") || digits.startsWith("8")
      ? digits.slice(1)
      : digits
  ).slice(0, 10);
  if (!national) {
    return "";
  }

  const area = national.slice(0, 3);
  const first = national.slice(3, 6);
  const second = national.slice(6, 8);
  const third = national.slice(8, 10);
  return [
    "+7",
    area ? ` (${area}` : "",
    national.length >= 3 ? ")" : "",
    first ? ` ${first}` : "",
    second ? `-${second}` : "",
    third ? `-${third}` : "",
  ].join("");
}

export function looksLikePhoneInput(value: string): boolean {
  return /^\s*(?:\+|[\d(])/.test(value);
}

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

export function looksLikePhoneInput(value: string): boolean {
  return /^\s*(?:\+|[\d(])/.test(value);
}

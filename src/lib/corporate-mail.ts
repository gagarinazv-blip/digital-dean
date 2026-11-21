const DEFAULT_CORPORATE_MAIL_DOMAIN = "mail.example.test";

export function getCorporateMailDomain(): string {
  const domain =
    process.env.CORPORATE_MAIL_DOMAIN?.trim().toLowerCase() ||
    DEFAULT_CORPORATE_MAIL_DOMAIN;
  const labels = domain.split(".");
  if (
    domain.length > 253 ||
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error("CORPORATE_MAIL_DOMAIN must be a valid domain.");
  }
  return domain;
}

export function normalizeCorporateEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email) return null;

  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator === email.length - 1 || email.length > 254) {
    return null;
  }

  const localPart = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  if (
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[a-z0-9._+-]+$/.test(localPart) ||
    domain !== getCorporateMailDomain()
  ) {
    return null;
  }

  return email;
}

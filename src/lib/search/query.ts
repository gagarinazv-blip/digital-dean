export type SearchQuery = {
  value: string;
  terms: string[];
};

export type SearchQueryError = "empty" | "too_short" | "too_long" | "invalid";

export type ParsedSearchQuery =
  | { ok: true; query: SearchQuery }
  | { ok: false; error: SearchQueryError };

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е");
}

export function parseSearchQuery(value: unknown): ParsedSearchQuery {
  if (typeof value !== "string") {
    return { ok: false, error: "invalid" };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "empty" };
  }
  if (trimmed.length > 100) {
    return { ok: false, error: "too_long" };
  }

  const normalized = normalizeSearchText(trimmed).replace(/\s+/g, " ");
  if (normalized.length < 2) {
    return { ok: false, error: "too_short" };
  }

  return {
    ok: true,
    query: { value: normalized, terms: normalized.split(" ") },
  };
}

export function matchesSearchQuery(
  query: SearchQuery,
  ...values: (string | null | undefined)[]
): boolean {
  const searchableText = normalizeSearchText(
    values.filter((value): value is string => Boolean(value)).join(" "),
  );
  return query.terms.every((term) => searchableText.includes(term));
}

export function getSearchTermVariants(term: string): string[] {
  const normalized = normalizeSearchText(term);
  const positions = Array.from(normalized.matchAll(/е/g), (match) => match.index);
  if (positions.length === 0) return [normalized];
  if (positions.length > 8) {
    return [normalized, normalized.replace(/е/g, "ё")];
  }

  const variants = new Set<string>();
  for (let mask = 0; mask < 2 ** positions.length; mask += 1) {
    const characters = normalized.split("");
    positions.forEach((position, bit) => {
      if (mask & (1 << bit)) characters[position] = "ё";
    });
    variants.add(characters.join(""));
  }
  return Array.from(variants);
}

export function getPhoneSearchDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) {
    return `7${digits.slice(1)}`;
  }
  return digits;
}

export function matchesStudentPhoneQuery(
  query: SearchQuery,
  searchableText: string[],
  phone: string | null,
): boolean {
  const phoneDigits = phone ? phone.replace(/\D/g, "") : "";
  const normalizedText = normalizeSearchText(searchableText.join(" "));

  return query.terms.every((term) => {
    if (normalizedText.includes(term)) {
      return true;
    }

    const digits = getPhoneSearchDigits(term);
    return digits.length > 0 && phoneDigits.includes(digits);
  });
}

export function paginateResults<T>(
  results: T[],
  limit: number,
): { results: T[]; hasMore: boolean } {
  const safeLimit = Math.max(0, Math.min(Math.floor(limit), 1000));
  return {
    results: results.slice(0, safeLimit),
    hasMore: results.length > safeLimit,
  };
}

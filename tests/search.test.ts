import { describe, expect, it } from "vitest";
import {
  getPhoneSearchDigits,
  getSearchTermVariants,
  matchesSearchQuery,
  matchesStudentPhoneQuery,
  parseSearchQuery,
} from "@/lib/search/query";
import { consumeSearchRateLimit } from "@/lib/search/rate-limit";

describe("search query normalization", () => {
  it("trims input, ignores case, folds ё to е, and requires every word", () => {
    const parsed = parseSearchQuery("  Ёлка   Иванов  ");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.query.value).toBe("елка иванов");
    expect(
      matchesSearchQuery(parsed.query, "Иванов Алексей", "Елка в аудитории"),
    ).toBe(true);
    expect(matchesSearchQuery(parsed.query, "Иванов Алексей")).toBe(false);
  });

  it("matches words with mixed е and ё spellings", () => {
    expect(getSearchTermVariants("березка")).toContain("берёзка");
  });

  it("accepts only trimmed queries from two to one hundred characters", () => {
    expect(parseSearchQuery("  ").ok).toBe(false);
    expect(parseSearchQuery("я").ok).toBe(false);
    expect(parseSearchQuery("я".repeat(100)).ok).toBe(true);
    expect(parseSearchQuery("я".repeat(101))).toEqual({
      ok: false,
      error: "too_long",
    });
  });

  it("limits each session to twenty searches per minute", () => {
    const sessionKey = `search-test-${Date.now()}`;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(consumeSearchRateLimit(sessionKey, 100_000 + attempt)).toBe(true);
    }
    expect(consumeSearchRateLimit(sessionKey, 100_020)).toBe(false);
    expect(consumeSearchRateLimit(sessionKey, 160_001)).toBe(true);
  });

  it("matches Russian phone numbers independent of +7 or 8 formatting", () => {
    expect(getPhoneSearchDigits("+7 (900) 000-00-02")).toBe("79000000002");
    expect(getPhoneSearchDigits("8 900 000-00-02")).toBe("79000000002");

    const parsed = parseSearchQuery("8 (900) 000-00-02");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      matchesStudentPhoneQuery(
        parsed.query,
        ["Анна Смирнова", "ПИ-31"],
        "+7 (900) 000-00-02",
      ),
    ).toBe(true);
    expect(
      matchesStudentPhoneQuery(
        parsed.query,
        ["Анна Смирнова", "ПИ-31"],
        "+7 (900) 000-00-03",
      ),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { formatRequestNumber } from "../src/lib/request-number";

describe("request numbers", () => {
  it("formats a database sequence number instead of exposing an ID token", () => {
    expect(formatRequestNumber(104)).toBe("№ 104");
  });

  it("rejects values that cannot be displayed as a request number", () => {
    expect(() => formatRequestNumber(0)).toThrow(RangeError);
    expect(() => formatRequestNumber(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      RangeError,
    );
  });
});

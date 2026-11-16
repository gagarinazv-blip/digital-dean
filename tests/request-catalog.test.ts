import { describe, expect, it } from "vitest";
import { getRequestFieldValues } from "../src/lib/request-catalog";

describe("request form values", () => {
  it("extracts fields for the selected service and ignores unrelated data", () => {
    expect(
      getRequestFieldValues("STUDY_CERTIFICATE", {
        purpose: "для деканата",
        unknownField: "не переносить",
      }),
    ).toEqual({ purpose: "для деканата" });
  });

  it("returns no values for unknown services or malformed stored data", () => {
    expect(
      getRequestFieldValues("UNKNOWN_SERVICE", { purpose: "текст" }),
    ).toEqual({});
    expect(getRequestFieldValues("STUDY_CERTIFICATE", null)).toEqual({});
  });
});

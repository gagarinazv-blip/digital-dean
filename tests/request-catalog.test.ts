import { describe, expect, it } from "vitest";
import {
  getRequestCatalogTitle,
  getRequestFieldEntries,
  getRequestFieldValues,
} from "../src/lib/request-catalog";

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

  it("uses the saved form schema for historical dynamic requests", () => {
    const snapshot = {
      code: "CUSTOM_CERTIFICATE",
      title: "Справка для конкурса",
      description: "Описание",
      executionDays: 3,
      requestType: "CERTIFICATE",
      fields: [
        {
          id: "purpose",
          label: "Куда нужна справка",
          kind: "text",
          required: true,
        },
      ],
    };

    expect(
      getRequestCatalogTitle("CUSTOM_CERTIFICATE", "Заявка", snapshot),
    ).toBe("Справка для конкурса");
    expect(
      getRequestFieldEntries(
        "CUSTOM_CERTIFICATE",
        { purpose: "для конкурса" },
        snapshot,
      ),
    ).toEqual([
      {
        id: "purpose",
        label: "Куда нужна справка",
        value: "для конкурса",
      },
    ]);
  });
});

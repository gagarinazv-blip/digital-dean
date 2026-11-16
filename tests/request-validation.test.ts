import { describe, expect, it } from "vitest";
import { validateRequestForm } from "../src/lib/request-validation";

describe("request form validation", () => {
  it("requires the catalog service's mandatory field", () => {
    const result = validateRequestForm({
      catalogCode: "STUDY_CERTIFICATE",
      fields: { purpose: " " },
      description: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.purpose).toBe("Заполните это поле.");
  });

  it("accepts a purpose at the maximum length and rejects longer input", () => {
    const purpose = "а".repeat(300);
    expect(
      validateRequestForm({
        catalogCode: "STUDY_CERTIFICATE",
        fields: { purpose },
        description: "",
      }).valid,
    ).toBe(true);

    const result = validateRequestForm({
      catalogCode: "STUDY_CERTIFICATE",
      fields: { purpose: `${purpose}а` },
      description: "",
    });
    expect(result.errors.purpose).toBe("Максимальная длина — 300 символов.");
  });

  it("rejects an unknown catalog service", () => {
    const result = validateRequestForm({
      catalogCode: "UNKNOWN_SERVICE",
      fields: {},
      description: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.catalogCode).toBe("Выберите тип заявки из списка.");
  });

  it("validates allowed select values and date period order", () => {
    const invalidReason = validateRequestForm({
      catalogCode: "CALL_CERTIFICATE",
      fields: {
        periodStart: "2026-11-18",
        periodEnd: "2026-11-25",
        reason: "NOT_ALLOWED",
      },
      description: "",
    });
    expect(invalidReason.errors.reason).toBe("Выберите значение из списка.");

    const invalidPeriod = validateRequestForm({
      catalogCode: "CALL_CERTIFICATE",
      fields: {
        periodStart: "2026-11-25",
        periodEnd: "2026-11-18",
        reason: "SESSION",
      },
      description: "",
    });
    expect(invalidPeriod.errors.periodEnd).toBe(
      "Дата окончания не может быть раньше даты начала.",
    );
  });

  it("rejects malformed dates and unknown fields", () => {
    const result = validateRequestForm({
      catalogCode: "CALL_CERTIFICATE",
      fields: {
        periodStart: "2026-02-30",
        periodEnd: "2026-03-01",
        reason: "SESSION",
        unexpected: "value",
      },
      description: "",
    });

    expect(result.errors.periodStart).toBe("Укажите корректную дату.");
    expect(result.errors.fields).toBe("Форма содержит неизвестные поля.");
  });
});

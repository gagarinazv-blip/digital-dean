import { describe, expect, it } from "vitest";
import { validateCertificateFormInput } from "../src/lib/certificate-form-validation";

const validInput = {
  code: "STUDY_CERTIFICATE",
  title: "Справка об обучении",
  description: "Подтверждение факта обучения.",
  executionDays: 5,
  active: true,
  fields: JSON.stringify([
    {
      id: "purpose",
      label: "Цель получения",
      kind: "text",
      required: true,
      maxLength: 300,
    },
  ]),
};

describe("certificate form validation", () => {
  it("accepts supported field types and optional fields", () => {
    const result = validateCertificateFormInput({
      ...validInput,
      fields: JSON.stringify([
        {
          id: "purpose",
          label: "Цель",
          kind: "text",
          required: true,
          maxLength: 300,
        },
        {
          id: "date",
          label: "Дата",
          kind: "date",
          required: false,
        },
        {
          id: "reason",
          label: "Причина",
          kind: "select",
          required: true,
          options: [{ value: "OTHER", label: "Другое" }],
        },
      ]),
    });

    expect(result.valid).toBe(true);
  });

  it("rejects malformed or duplicate field definitions", () => {
    const malformed = validateCertificateFormInput({
      ...validInput,
      fields: "{invalid json",
    });
    expect(malformed).toMatchObject({
      valid: false,
      errors: { fields: "Добавьте от 1 до 20 корректно заполненных полей." },
    });

    const duplicated = validateCertificateFormInput({
      ...validInput,
      fields: JSON.stringify([
        {
          id: "purpose",
          label: "Цель",
          kind: "text",
          required: true,
        },
        {
          id: "purpose",
          label: "Другая цель",
          kind: "text",
          required: false,
        },
      ]),
    });
    expect(duplicated).toMatchObject({
      valid: false,
      errors: { fields: "Идентификаторы полей должны быть уникальными." },
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  makeCertificateCode,
  makeFieldKey,
  normalizeCertificateTitle,
  validateCertificateFormInput,
} from "../src/lib/certificate-form-validation";
import {
  createRequestCatalogSnapshot,
  getRequestFieldEntries,
  getUnknownTemplatePlaceholders,
  renderCertificateTemplate,
  type RequestCatalogEntry,
} from "../src/lib/request-catalog";
import { validateRequestForm } from "../src/lib/request-validation";

const field = (overrides: Record<string, unknown> = {}) => ({
  id: "purpose",
  label: "Цель",
  kind: "text",
  required: true,
  ...overrides,
});

const allFields = [
  field({ maxLength: 300, hint: "Куда нужна справка" }),
  field({ id: "count", label: "Экземпляров", kind: "number", min: 1, max: 3 }),
  field({ id: "since", label: "С даты", kind: "date" }),
  field({
    id: "language",
    label: "Язык",
    kind: "select",
    options: [
      { value: "OPTION_1", label: "Русский" },
      { value: "OPTION_2", label: "Английский" },
    ],
  }),
  field({ id: "agree", label: "Согласие", kind: "checkbox" }),
  field({ id: "scan", label: "Скан", kind: "file", required: false }),
];

const validInput = {
  title: "Справка об обучении",
  description: "Подтверждение факта обучения.",
  executionDays: 5,
  deliveryMethods: ["ELECTRONIC", "DEAN_OFFICE"],
  requiresApproval: true,
  template: "{{ФИО}}, {{ группа }}, {{дата}}",
  fields: allFields,
};

function errorsOf(input: Record<string, unknown>) {
  const result = validateCertificateFormInput({ ...validInput, ...input });
  return result.valid ? {} : result.errors;
}

describe("certificate form schema", () => {
  it("accepts every field type", () => {
    const result = validateCertificateFormInput(validInput);
    expect(result.valid && result.value.fields.map(({ kind }) => kind)).toEqual([
      "text",
      "number",
      "date",
      "select",
      "checkbox",
      "file",
    ]);
  });

  it.each([
    ["title", { title: "  " }],
    ["title", { title: "x".repeat(121) }],
    ["description", { description: "" }],
    ["executionDays", { executionDays: 0 }],
    ["executionDays", { executionDays: -2 }],
    ["executionDays", { executionDays: 1.5 }],
    ["executionDays", { executionDays: "5" }],
    ["deliveryMethods", { deliveryMethods: ["PIGEON"] }],
    ["template", { template: "Выдана {{паспорт}}" }],
    ["fields", { fields: [] }],
    ["fields.0.label", { fields: [field({ label: " " })] }],
    ["fields.0.id", { fields: [field({ id: "1 поле" })] }],
    ["fields.1.id", { fields: [field(), field({ label: "Другая" })] }],
    ["fields.0.kind", { fields: [field({ kind: "html" })] }],
    ["fields.0.options", { fields: [field({ kind: "select", options: [] })] }],
    [
      "fields.0.options",
      {
        fields: [
          field({
            kind: "select",
            options: [
              { value: "A", label: "Да" },
              { value: "B", label: "да" },
            ],
          }),
        ],
      },
    ],
    ["fields.0.max", { fields: [field({ kind: "number", min: 5, max: 1 })] }],
    ["fields.0.max", { fields: [field({ kind: "number", max: NaN })] }],
    ["fields.0.maxLength", { fields: [field({ maxLength: 0 })] }],
  ])("reports %s next to its field", (key, input) => {
    expect(errorsOf(input)).toHaveProperty([key]);
  });

  it.each([null, "text", [], undefined])("rejects %j as the whole input", (value) => {
    expect(validateCertificateFormInput(value).valid).toBe(false);
  });

  it("normalizes titles and generates codes and keys", () => {
    expect(normalizeCertificateTitle("  Справка   О стипендии ")).toBe(
      "справка о стипендии",
    );
    expect(makeCertificateCode("Справка о стипендии")).toBe("SPRAVKA_O_STIPENDII");
    expect(makeCertificateCode("2-НДФЛ")).toBe("FORM_2_NDFL");
    expect(makeFieldKey("Дата выдачи", new Set())).toBe("data_vydachi");
    expect(makeFieldKey("Дата выдачи", new Set(["data_vydachi"]))).toBe(
      "data_vydachi_2",
    );
  });

  it("substitutes only known placeholders", () => {
    const values = { fullName: "Анна Иванова", groupName: "ИС-21", date: "22 ноября" };
    expect(renderCertificateTemplate("{{ФИО}} ({{ группа }}), {{дата}}", values)).toBe(
      "Анна Иванова (ИС-21), 22 ноября",
    );
    expect(renderCertificateTemplate("{{секрет}}", values)).toBe("{{секрет}}");
    expect(getUnknownTemplatePlaceholders("{{секрет}} {{ФИО}}")).toEqual(["секрет"]);
  });
});

describe("request versioning", () => {
  const validated = validateCertificateFormInput(validInput);
  if (!validated.valid) throw new Error("The fixture must be valid.");
  const entry: RequestCatalogEntry = {
    ...validated.value,
    code: "TEST_FORM",
    active: true,
    requestType: "CERTIFICATE",
    version: 3,
  };
  const values = {
    purpose: "виза",
    count: "2",
    since: "2026-11-22",
    language: "OPTION_2",
    agree: "true",
    scan: "",
  };
  const validate = (fields: Record<string, string>) =>
    validateRequestForm(
      { catalogCode: "TEST_FORM", fields, description: "" },
      [entry],
    ).errors;

  it("validates a submitted request by its schema", () => {
    expect(validate(values)).toEqual({});
    expect(validate({ ...values, count: "пять" })).toHaveProperty("count");
    expect(validate({ ...values, count: "4" })).toHaveProperty("count");
    expect(validate({ ...values, agree: "" })).toEqual({
      agree: "Отметьте этот пункт.",
    });
    expect(validate({ ...values, language: "OPTION_9" })).toHaveProperty("language");
    expect(validate({ ...values, extra: "1" })).toHaveProperty("fields");
  });

  it("keeps a submitted request readable after the form changes", () => {
    const snapshot = JSON.parse(JSON.stringify(createRequestCatalogSnapshot(entry)));
    expect(snapshot.version).toBe(3);
    const before = getRequestFieldEntries("TEST_FORM", values, snapshot);

    // Вид справки переименовали, поля удалили и заменили.
    const changed = {
      ...entry,
      title: "Новое название",
      version: 4,
      fields: [{ id: "other", label: "Другое", kind: "text", required: true }],
    } satisfies RequestCatalogEntry;
    expect(createRequestCatalogSnapshot(changed).fields).toHaveLength(1);
    expect(getRequestFieldEntries("TEST_FORM", values, snapshot)).toEqual(before);
    expect(before).toEqual([
      { id: "purpose", label: "Цель", value: "виза", kind: "text" },
      { id: "count", label: "Экземпляров", value: "2", kind: "number" },
      { id: "since", label: "С даты", value: "2026-11-22", kind: "date" },
      { id: "language", label: "Язык", value: "Английский", kind: "select" },
      { id: "agree", label: "Согласие", value: "Да", kind: "checkbox" },
    ]);
  });

  it("reads snapshots saved before versions existed", () => {
    expect(
      getRequestFieldEntries(
        "OLD",
        { purpose: "работа" },
        {
          code: "OLD",
          title: "Старая справка",
          description: "Описание",
          executionDays: 5,
          fields: [field()],
        },
      ),
    ).toEqual([{ id: "purpose", label: "Цель", value: "работа", kind: "text" }]);
  });
});

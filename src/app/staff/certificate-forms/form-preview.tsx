"use client";

import { useState } from "react";
import { RequestFieldInput } from "@/components/request-field-input";
import controls from "@/components/ui/controls.module.css";
import {
  formatDeliveryMethods,
  renderCertificateTemplate,
  validateRequestCatalogField,
  type CertificateDelivery,
  type RequestCatalogField,
} from "@/lib/request-catalog";
import { toFieldInput, type DraftField } from "./field-builder";
import styles from "./certificate-forms.module.css";

export type CertificateFormDraft = {
  title: string;
  description: string;
  executionDays: string;
  deliveryMethods: CertificateDelivery[];
  requiresApproval: boolean;
  template: string;
  fields: DraftField[];
};

// Незаполненное поле тоже показываем, чтобы было видно, чего не хватает.
function toPreviewField(field: DraftField, index: number): RequestCatalogField {
  const input = {
    ...toFieldInput(field),
    label: field.label.trim() || `Поле ${index + 1}`,
    ...(field.kind === "select"
      ? {
          options: field.options.map((option, optionIndex) => ({
            value: option.value,
            label: option.label.trim() || `Вариант ${optionIndex + 1}`,
          })),
        }
      : {}),
  };
  return (
    validateRequestCatalogField(input) ?? {
      id: `preview${index}`,
      label: input.label,
      kind: "text",
      required: field.required,
    }
  );
}

export function FormPreview({
  draft,
  today,
}: {
  draft: CertificateFormDraft;
  today: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <section aria-label="Предпросмотр формы студента" className={styles.preview}>
      <div className={styles.previewCard}>
        <h3>{draft.title.trim() || "Название справки"}</h3>
        <p>{draft.description.trim() || "Описание для студента"}</p>
        <p className={controls.hint}>
          {formatDeliveryMethods(draft.deliveryMethods)} · до{" "}
          {draft.executionDays || "…"} рабочих дней
          {draft.requiresApproval ? " · с согласованием" : ""}
        </p>
      </div>
      <div className={styles.previewFields}>
        {draft.fields.map((field, index) => (
          <RequestFieldInput
            field={toPreviewField(field, index)}
            key={field.rowKey}
            onChange={(value) =>
              setValues((current) => ({ ...current, [field.rowKey]: value }))
            }
            value={values[field.rowKey] ?? ""}
          />
        ))}
      </div>
      {draft.template.trim() ? (
        <div className={styles.previewTemplate}>
          <h3>Текст справки</h3>
          <p>
            {renderCertificateTemplate(draft.template.trim(), {
              fullName: "Иванова Анна Сергеевна",
              groupName: "ИС-21",
              date: today,
            })}
          </p>
          <p className={controls.hint}>
            Студент этого текста не видит: его использует сотрудник при
            подготовке документа.
          </p>
        </div>
      ) : null}
    </section>
  );
}

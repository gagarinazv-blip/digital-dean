"use client";

import { useState } from "react";
import type { OpportunityType } from "@/generated/prisma/enums";
import {
  opportunityTypeConfig,
  opportunityTypes,
} from "@/lib/opportunity-catalog";
import type { OpportunityRequirement } from "@/lib/opportunities";

export function OpportunityTypeFields({
  initialType,
  initialDetails,
}: {
  initialType: OpportunityType;
  initialDetails: Record<string, unknown>;
}) {
  const [type, setType] = useState(initialType);
  const details = opportunityTypeConfig[type].fields;

  return (
    <>
      <label>
        Тип
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.currentTarget.value as OpportunityType)}
          required
        >
          {opportunityTypes.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="opportunity-type-fields">
        <legend>Параметры типа</legend>
        {details.map((field) => {
          const value = initialDetails[field.name];
          if (field.type === "checkbox") {
            return (
              <label className="opportunity-check" key={field.name}>
                <input
                  type="checkbox"
                  name={`detail_${field.name}`}
                  value="true"
                  defaultChecked={value === true}
                />
                {field.label}
              </label>
            );
          }
          if (field.type === "textarea") {
            return (
              <label key={field.name}>
                {field.label}
                <textarea
                  name={`detail_${field.name}`}
                  maxLength={field.maxLength}
                  required={field.required}
                  defaultValue={typeof value === "string" ? value : ""}
                />
              </label>
            );
          }
          return (
            <label key={field.name}>
              {field.label}
              <input
                type={field.type}
                name={`detail_${field.name}`}
                min={field.min}
                max={field.max}
                maxLength={field.maxLength}
                required={field.required}
                defaultValue={
                  typeof value === "string" || typeof value === "number"
                    ? value
                    : ""
                }
              />
            </label>
          );
        })}
      </fieldset>
    </>
  );
}

export function RequiredDocumentsEditor({
  initialDocuments,
}: {
  initialDocuments: OpportunityRequirement[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);

  function update(
    index: number,
    patch: Partial<OpportunityRequirement>,
  ) {
    setDocuments((current) =>
      current.map((document, documentIndex) =>
        documentIndex === index ? { ...document, ...patch } : document,
      ),
    );
  }

  return (
    <fieldset className="opportunity-required-documents">
      <legend>Необходимые документы</legend>
      <input
        type="hidden"
        name="requiredDocuments"
        value={JSON.stringify(documents)}
      />
      {documents.map((document, index) => (
        <div className="opportunity-document-row" key={`${index}-${document.key}`}>
          <label>
            Ключ
            <input
              value={document.key}
              maxLength={80}
              onChange={(event) => update(index, { key: event.currentTarget.value })}
              aria-label={`Ключ документа ${index + 1}`}
            />
          </label>
          <label>
            Название
            <input
              value={document.title}
              maxLength={120}
              onChange={(event) => update(index, { title: event.currentTarget.value })}
              aria-label={`Название документа ${index + 1}`}
            />
          </label>
          <label className="opportunity-check">
            <input
              type="checkbox"
              checked={document.required}
              onChange={(event) => update(index, { required: event.currentTarget.checked })}
            />
            Обязательно
          </label>
          <button
            type="button"
            className="opportunity-remove-document"
            onClick={() =>
              setDocuments((current) =>
                current.filter((_, documentIndex) => documentIndex !== index),
              )
            }
          >
            Удалить
          </button>
        </div>
      ))}
      <button
        type="button"
        className="opportunity-add-document"
        disabled={documents.length >= 10}
        onClick={() =>
          setDocuments((current) => [
            ...current,
            { key: `document-${current.length + 1}`, title: "", required: false },
          ])
        }
      >
        Добавить документ
      </button>
    </fieldset>
  );
}

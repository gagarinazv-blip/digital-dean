import "server-only";

import { getPrisma } from "@/lib/prisma";
import {
  validateRequestCatalogField,
  type RequestCatalogEntry,
  type RequestCatalogField,
} from "@/lib/request-catalog";

function toCatalogEntry(row: {
  code: string;
  title: string;
  description: string;
  executionDays: number;
  fields: unknown;
  active: boolean;
}): RequestCatalogEntry {
  if (!Array.isArray(row.fields)) {
    throw new Error(`Certificate form "${row.code}" has invalid fields.`);
  }

  const fields: RequestCatalogField[] = [];
  for (const value of row.fields) {
    const field = validateRequestCatalogField(value);
    if (!field) {
      throw new Error(`Certificate form "${row.code}" has invalid fields.`);
    }
    fields.push(field);
  }

  return {
    code: row.code,
    title: row.title,
    description: row.description,
    executionDays: row.executionDays,
    fields,
    active: row.active,
    requestType: "CERTIFICATE",
  };
}

export async function getCertificateForms({
  includeInactive = false,
}: {
  includeInactive?: boolean;
} = {}): Promise<RequestCatalogEntry[]> {
  const rows = await getPrisma().certificateForm.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      code: true,
      title: true,
      description: true,
      executionDays: true,
      fields: true,
      active: true,
    },
  });

  return rows.map(toCatalogEntry);
}

export async function getActiveCertificateForm(
  code: string,
): Promise<RequestCatalogEntry | null> {
  const row = await getPrisma().certificateForm.findFirst({
    where: { code, active: true },
    select: {
      code: true,
      title: true,
      description: true,
      executionDays: true,
      fields: true,
      active: true,
    },
  });

  return row ? toCatalogEntry(row) : null;
}

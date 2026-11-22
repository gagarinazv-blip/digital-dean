import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type {
  CertificateDeliveryMethod,
  CertificateFormAuditAction,
  CertificateFormStatus,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import {
  validateRequestCatalogField,
  type RequestCatalogEntry,
  type RequestCatalogField,
} from "@/lib/request-catalog";

const entrySelection = {
  code: true,
  title: true,
  description: true,
  executionDays: true,
  fields: true,
  status: true,
  deliveryMethods: true,
  requiresApproval: true,
  template: true,
  version: true,
} satisfies Prisma.CertificateFormSelect;

type CertificateFormRow = {
  code: string;
  title: string;
  description: string;
  executionDays: number;
  fields: unknown;
  status: CertificateFormStatus;
  deliveryMethods: CertificateDeliveryMethod[];
  requiresApproval: boolean;
  template: string;
  version: number;
};

function parseFields(code: string, value: unknown): RequestCatalogField[] {
  if (!Array.isArray(value)) {
    throw new Error(`Certificate form "${code}" has invalid fields.`);
  }
  return value.map((rawField) => {
    const field = validateRequestCatalogField(rawField);
    if (!field) {
      throw new Error(`Certificate form "${code}" has invalid fields.`);
    }
    return field;
  });
}

function toCatalogEntry(row: CertificateFormRow): RequestCatalogEntry {
  return {
    code: row.code,
    title: row.title,
    description: row.description,
    executionDays: row.executionDays,
    fields: parseFields(row.code, row.fields),
    active: row.status === "ACTIVE",
    requestType: "CERTIFICATE",
    version: row.version,
    deliveryMethods: row.deliveryMethods,
    requiresApproval: row.requiresApproval,
    template: row.template,
  };
}

/** Виды справок, доступные студентам для заказа. */
export async function getCertificateForms(): Promise<RequestCatalogEntry[]> {
  const rows = await getPrisma().certificateForm.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: entrySelection,
  });

  return rows.map(toCatalogEntry);
}

export async function getActiveCertificateForm(
  code: string,
): Promise<RequestCatalogEntry | null> {
  const row = await getPrisma().certificateForm.findFirst({
    where: { code, status: "ACTIVE" },
    select: entrySelection,
  });

  return row ? toCatalogEntry(row) : null;
}

export type ManagedCertificateForm = {
  code: string;
  title: string;
  description: string;
  executionDays: number;
  deliveryMethods: CertificateDeliveryMethod[];
  requiresApproval: boolean;
  template: string;
  fields: RequestCatalogField[];
  status: CertificateFormStatus;
  version: number;
  requestCount: number;
  updatedAt: Date;
  history: {
    id: number;
    action: CertificateFormAuditAction;
    version: number;
    changedFields: string[];
    createdAt: Date;
    actorName: string;
  }[];
};

/** Все виды справок для главного сотрудника. Права проверяет вызывающий код. */
export async function getManagedCertificateForms(): Promise<
  ManagedCertificateForm[]
> {
  const prisma = getPrisma();
  const [rows, counts] = await Promise.all([
    prisma.certificateForm.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        ...entrySelection,
        updatedAt: true,
        auditLogs: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
          select: {
            id: true,
            action: true,
            version: true,
            changedFields: true,
            createdAt: true,
            actor: {
              select: {
                login: true,
                staffProfile: { select: { fullName: true } },
              },
            },
          },
        },
      },
    }),
    prisma.request.groupBy({
      by: ["catalogCode"],
      where: { catalogCode: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const requestCounts = new Map(
    counts.map((row) => [row.catalogCode, row._count._all]),
  );

  return rows.map(({ auditLogs, ...row }) => ({
    ...row,
    fields: parseFields(row.code, row.fields),
    requestCount: requestCounts.get(row.code) ?? 0,
    history: auditLogs.map(({ actor, ...entry }) => ({
      ...entry,
      actorName: actor?.staffProfile?.fullName ?? actor?.login ?? "Система",
    })),
  }));
}

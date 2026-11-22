"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
import {
  CERTIFICATE_TITLE_LIMIT,
  makeCertificateCode,
  makeUniqueName,
  normalizeCertificateTitle,
  validateCertificateFormInput,
  type CertificateFormErrors,
  type CertificateFormInput,
} from "@/lib/certificate-form-validation";
import { getPrisma } from "@/lib/prisma";
import { validateRequestCatalogField } from "@/lib/request-catalog";
import { requireStaffContext } from "@/lib/staff";

export type CertificateFormActionResult =
  | { ok: true; message: string; code: string }
  | { ok: false; error: string; fieldErrors?: CertificateFormErrors };

const saveError = "Не удалось сохранить вид справки. Попробуйте позже.";
const missingError = "Вид справки не найден. Обновите страницу.";
const conflictError =
  "Вид справки уже изменили в другом окне. Обновите страницу и повторите правки.";
const duplicateTitle = {
  ok: false,
  error: "Проверьте выделенные поля.",
  fieldErrors: { title: "Вид справки с таким названием уже есть." },
} as const;

// Единственный вход во все действия раздела: сессия, источник запроса и роль.
async function requireCertificateFormManager(): Promise<number> {
  await assertSameSiteRequest();
  const { isManagerAccount, userId } = await requireStaffContext();
  if (!isManagerAccount) {
    forbidden();
  }
  return userId;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function revalidateCertificateFormViews(): void {
  revalidatePath("/staff/certificate-forms");
  revalidatePath("/requests/new");
  revalidatePath("/documents");
}

function isCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z][A-Z0-9_]{2,63}$/.test(value);
}

function getFormData(input: CertificateFormInput) {
  return {
    title: input.title,
    normalizedTitle: normalizeCertificateTitle(input.title),
    description: input.description,
    executionDays: input.executionDays,
    deliveryMethods: input.deliveryMethods,
    requiresApproval: input.requiresApproval,
    template: input.template,
    fields: input.fields,
  };
}

async function makeFreeCode(title: string): Promise<string> {
  const base = makeCertificateCode(title);
  const taken = await getPrisma().certificateForm.findMany({
    where: { code: { startsWith: base } },
    select: { code: true },
  });
  return makeUniqueName(base, new Set(taken.map(({ code }) => code)));
}

export async function createCertificateFormAction(
  rawInput: unknown,
  publish: unknown,
): Promise<CertificateFormActionResult> {
  const actorUserId = await requireCertificateFormManager();
  const validated = validateCertificateFormInput(rawInput);
  if (!validated.valid) {
    return {
      ok: false,
      error: "Проверьте выделенные поля.",
      fieldErrors: validated.errors,
    };
  }

  const status = publish === true ? "ACTIVE" : "DRAFT";
  try {
    const code = await makeFreeCode(validated.value.title);
    await getPrisma().certificateForm.create({
      data: {
        ...getFormData(validated.value),
        code,
        status,
        active: status === "ACTIVE",
        sortOrder: 100,
        auditLogs: { create: { actorUserId, action: "CREATED", version: 1 } },
      },
    });
    revalidateCertificateFormViews();
    return {
      ok: true,
      code,
      message:
        status === "ACTIVE"
          ? "Вид справки создан и доступен студентам."
          : "Черновик вида справки сохранён.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) return duplicateTitle;
    console.error("[certificate-forms:create] Не удалось сохранить форму.", {
      actorUserId,
      error,
    });
    return { ok: false, error: saveError };
  }
}

export async function updateCertificateFormAction(
  code: unknown,
  expectedVersion: unknown,
  rawInput: unknown,
): Promise<CertificateFormActionResult> {
  const actorUserId = await requireCertificateFormManager();
  if (!isCode(code) || !Number.isSafeInteger(expectedVersion)) {
    return { ok: false, error: missingError };
  }
  const validated = validateCertificateFormInput(rawInput);
  if (!validated.valid) {
    return {
      ok: false,
      error: "Проверьте выделенные поля.",
      fieldErrors: validated.errors,
    };
  }

  try {
    const prisma = getPrisma();
    const current = await prisma.certificateForm.findUnique({
      where: { code },
      select: {
        id: true,
        title: true,
        description: true,
        executionDays: true,
        deliveryMethods: true,
        requiresApproval: true,
        template: true,
        fields: true,
      },
    });
    if (!current) return { ok: false, error: missingError };

    const data = getFormData(validated.value);
    // jsonb не хранит порядок ключей: приводим сохранённые поля к виду схемы.
    const currentFields = Array.isArray(current.fields)
      ? current.fields.map((field) => validateRequestCatalogField(field))
      : [];
    const previous = { ...current, fields: currentFields };
    const changedFields = (
      [
        "title",
        "description",
        "executionDays",
        "deliveryMethods",
        "requiresApproval",
        "template",
        "fields",
      ] as const
    ).filter(
      (name) => JSON.stringify(previous[name]) !== JSON.stringify(data[name]),
    );
    if (changedFields.length === 0) {
      return { ok: true, code, message: "Изменений нет." };
    }

    // Заявки хранят снимок формы, поэтому новая версия их не меняет.
    const version = Number(expectedVersion) + 1;
    const isSaved = await prisma.$transaction(async (tx) => {
      const updated = await tx.certificateForm.updateMany({
        where: { id: current.id, version: Number(expectedVersion) },
        data: { ...data, version },
      });
      if (updated.count !== 1) return false;
      await tx.certificateFormAuditLog.create({
        data: {
          formId: current.id,
          actorUserId,
          action: "UPDATED",
          version,
          changedFields,
        },
      });
      return true;
    });
    if (!isSaved) return { ok: false, error: conflictError };
  } catch (error) {
    if (isUniqueConstraintError(error)) return duplicateTitle;
    console.error("[certificate-forms:update] Не удалось сохранить форму.", {
      actorUserId,
      code,
      error,
    });
    return { ok: false, error: saveError };
  }

  revalidateCertificateFormViews();
  return { ok: true, code, message: "Изменения вида справки сохранены." };
}

export async function duplicateCertificateFormAction(
  code: unknown,
): Promise<CertificateFormActionResult> {
  const actorUserId = await requireCertificateFormManager();
  if (!isCode(code)) return { ok: false, error: missingError };

  try {
    const prisma = getPrisma();
    const source = await prisma.certificateForm.findUnique({
      where: { code },
      select: {
        title: true,
        description: true,
        executionDays: true,
        deliveryMethods: true,
        requiresApproval: true,
        template: true,
        fields: true,
        sortOrder: true,
      },
    });
    if (!source || source.fields === null) {
      return { ok: false, error: missingError };
    }

    const titles = await prisma.certificateForm.findMany({
      select: { title: true, normalizedTitle: true },
    });
    const taken = new Set(titles.map((form) => form.normalizedTitle));
    const base = source.title.slice(0, CERTIFICATE_TITLE_LIMIT - 14).trim();
    let title = `${base} (копия)`;
    for (let index = 2; taken.has(normalizeCertificateTitle(title)); index += 1) {
      title = `${base} (копия ${index})`;
    }
    const newCode = await makeFreeCode(title);
    await prisma.certificateForm.create({
      data: {
        ...source,
        fields: source.fields,
        title,
        normalizedTitle: normalizeCertificateTitle(title),
        code: newCode,
        status: "DRAFT",
        active: false,
        auditLogs: { create: { actorUserId, action: "DUPLICATED", version: 1 } },
      },
    });
    revalidateCertificateFormViews();
    return { ok: true, code: newCode, message: `Создан черновик «${title}».` };
  } catch (error) {
    console.error("[certificate-forms:duplicate] Не удалось создать копию.", {
      actorUserId,
      code,
      error,
    });
    return { ok: false, error: "Не удалось создать копию. Попробуйте позже." };
  }
}

export async function setCertificateFormStatusAction(
  code: unknown,
  status: unknown,
): Promise<CertificateFormActionResult> {
  const actorUserId = await requireCertificateFormManager();
  if (!isCode(code) || (status !== "ACTIVE" && status !== "ARCHIVED")) {
    return { ok: false, error: missingError };
  }

  try {
    const isUpdated = await getPrisma().$transaction(async (tx) => {
      const form = await tx.certificateForm.findUnique({
        where: { code },
        select: { id: true, version: true, status: true },
      });
      if (!form) return false;
      if (form.status === status) return true;
      await tx.certificateForm.update({
        where: { id: form.id },
        data: { status, active: status === "ACTIVE" },
      });
      await tx.certificateFormAuditLog.create({
        data: {
          formId: form.id,
          actorUserId,
          action: status === "ACTIVE" ? "ACTIVATED" : "ARCHIVED",
          version: form.version,
          changedFields: ["status"],
        },
      });
      return true;
    });
    if (!isUpdated) return { ok: false, error: missingError };
  } catch (error) {
    console.error("[certificate-forms:status] Не удалось изменить статус.", {
      actorUserId,
      code,
      error,
    });
    return { ok: false, error: "Не удалось изменить статус. Попробуйте позже." };
  }

  revalidateCertificateFormViews();
  return {
    ok: true,
    code,
    message:
      status === "ACTIVE"
        ? "Вид справки доступен студентам."
        : "Вид справки в архиве. Поданные заявки сохранены.",
  };
}

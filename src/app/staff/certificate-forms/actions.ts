"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  validateCertificateFormInput,
  type CertificateFormValidation,
} from "@/lib/certificate-form-validation";
import { requireStaffContext } from "@/lib/staff";

export type CertificateFormActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function getFormInput(
  formData: FormData,
  code: string,
  activeByDefault = false,
): CertificateFormValidation {
  const rawExecutionDays = formData.get("executionDays");
  return validateCertificateFormInput({
    code,
    title: formData.get("title"),
    description: formData.get("description"),
    executionDays:
      typeof rawExecutionDays === "string" && /^\d+$/.test(rawExecutionDays)
        ? Number(rawExecutionDays)
        : NaN,
    fields: formData.get("fields"),
    active: formData.has("active") ? formData.get("active") === "true" : activeByDefault,
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function requireCertificateFormManager(): Promise<void> {
  await assertSameSiteRequest();
  const { isManagerAccount } = await requireStaffContext();
  if (!isManagerAccount) {
    forbidden();
  }
}

function revalidateCertificateFormViews(): void {
  revalidatePath("/staff/certificate-forms");
  revalidatePath("/requests/new");
  revalidatePath("/documents");
}

export async function createCertificateFormAction(
  _previousState: CertificateFormActionState,
  formData: FormData,
): Promise<CertificateFormActionState> {
  await requireCertificateFormManager();
  const rawCode = formData.get("code");
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  const validated = getFormInput(formData, code, true);
  if (!validated.valid) {
    return {
      error: "Исправьте ошибки в форме справки.",
      fieldErrors: validated.errors,
    };
  }

  try {
    await getPrisma().certificateForm.create({
      data: {
        ...validated.value,
        sortOrder: 100,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        error: "Форма с таким кодом уже существует.",
        fieldErrors: { code: "Выберите уникальный код." },
      };
    }
    console.error("[certificate-forms:create] Не удалось сохранить форму.", {
      code,
      error,
    });
    return { error: "Не удалось сохранить форму. Попробуйте позже." };
  }

  revalidateCertificateFormViews();
  return { success: "Форма справки создана." };
}

export async function updateCertificateFormAction(
  _previousState: CertificateFormActionState,
  formData: FormData,
): Promise<CertificateFormActionState> {
  await requireCertificateFormManager();
  const rawCode = formData.get("code");
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  const validated = getFormInput(formData, code);
  if (!validated.valid) {
    return {
      error: "Исправьте ошибки в форме справки.",
      fieldErrors: validated.errors,
    };
  }

  try {
    const updated = await getPrisma().certificateForm.updateMany({
      where: { code },
      data: {
        title: validated.value.title,
        description: validated.value.description,
        executionDays: validated.value.executionDays,
        fields: validated.value.fields,
        active: validated.value.active,
      },
    });
    if (updated.count !== 1) {
      return { error: "Форма не найдена. Обновите страницу." };
    }
  } catch (error) {
    console.error("[certificate-forms:update] Не удалось сохранить форму.", {
      code,
      error,
    });
    return { error: "Не удалось сохранить форму. Попробуйте позже." };
  }

  revalidateCertificateFormViews();
  return {
    success: validated.value.active
      ? "Изменения формы сохранены."
      : "Форма отправлена в архив. Уже поданные заявки сохранены.",
  };
}

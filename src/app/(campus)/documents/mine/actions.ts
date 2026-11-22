"use server";

import { revalidatePath } from "next/cache";
import { assertSameSiteRequest } from "@/lib/auth";
import { fileStorage } from "@/lib/file-storage";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import type { StudentDocumentActionState } from "@/lib/student-document-action-state";

function detectType(data: Buffer): "pdf" | "jpg" | "png" | null {
  if (data.subarray(0, 4).toString("hex") === "25504446") return "pdf";
  if (data.subarray(0, 3).toString("hex") === "ffd8ff") return "jpg";
  if (data.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  return null;
}

const documentTypes = [
  "PASSPORT",
  "SNILS",
  "INSURANCE",
  "CONTRACT",
  "REFERENCE",
  "OTHER",
] as const;

function isStudentDocumentType(
  value: string,
): value is (typeof documentTypes)[number] {
  return documentTypes.some((documentType) => documentType === value);
}

export async function uploadStudentDocumentAction(
  _previousState: StudentDocumentActionState,
  formData: FormData,
): Promise<StudentDocumentActionState> {
  await assertSameSiteRequest();
  const student = await requireStudent();
  const title = String(formData.get("title") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "OTHER");
  const file = formData.get("file");
  if (title.length < 1 || title.length > 120) {
    return { error: "Введите название до 120 символов." };
  }
  if (!(file instanceof File)) return { error: "Выберите файл." };
  if (file.size < 1 || file.size > 10 * 1024 * 1024) {
    return { error: "Файл должен быть от 1 байта до 10 МБ." };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const extension = detectType(data);
  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  const expectedMimeType =
    extension === "pdf"
      ? "application/pdf"
      : extension === "jpg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : null;
  const extensionMatches =
    extension === "jpg"
      ? fileExtension === "jpg" || fileExtension === "jpeg"
      : fileExtension === extension;
  if (!extension || !expectedMimeType || !extensionMatches || file.type !== expectedMimeType) {
    return { error: "Допустимы только PDF, JPG и PNG с корректным расширением." };
  }
  const count = await getPrisma().studentDocument.count({ where: { studentId: student.id } });
  if (count >= 200) return { error: "Достигнут лимит личных документов." };
  const storedName = await fileStorage.save(data, extension);
  await getPrisma().studentDocument.create({
    data: {
      studentId: student.id,
      title,
      documentType: isStudentDocumentType(documentType)
        ? documentType
        : "OTHER",
      storedName,
      originalName: file.name.split(/[\\/]/).pop()?.slice(0, 255) ?? "document",
      mimeType: expectedMimeType,
      size: file.size,
    },
  });
  revalidatePath("/documents/mine");
  return { success: "Документ загружен." };
}

export async function renameStudentDocumentAction(
  _previousState: StudentDocumentActionState,
  formData: FormData,
): Promise<StudentDocumentActionState> {
  await assertSameSiteRequest();
  const student = await requireStudent();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!Number.isSafeInteger(id) || id < 1) {
    return { error: "Не удалось найти документ." };
  }
  if (title.length < 1 || title.length > 120) {
    return { error: "Название должно содержать от 1 до 120 символов." };
  }
  const document = await getPrisma().studentDocument.findFirst({
    where: { id, studentId: student.id },
  });
  if (!document) return { error: "Документ не найден." };
  await getPrisma().studentDocument.update({
    where: { id: document.id },
    data: { title },
  });
  revalidatePath("/documents/mine");
  return { success: "Название документа обновлено." };
}

export async function deleteStudentDocumentAction(
  _previousState: StudentDocumentActionState,
  formData: FormData,
): Promise<StudentDocumentActionState> {
  await assertSameSiteRequest();
  const student = await requireStudent();
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) {
    return { error: "Не удалось найти документ." };
  }
  const document = await getPrisma().studentDocument.findFirst({
    where: { id, studentId: student.id },
  });
  if (!document) return { error: "Документ не найден." };
  await getPrisma().studentDocument.delete({ where: { id } });
  try {
    await fileStorage.delete(document.storedName);
  } catch {
    console.error("Student document file deletion failed.");
  }
  revalidatePath("/documents/mine");
  return { success: "Документ удалён." };
}

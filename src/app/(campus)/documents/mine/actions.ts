"use server";

import { redirect } from "next/navigation";
import { fileStorage } from "@/lib/file-storage";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";

function detectType(data: Buffer): "pdf" | "jpg" | "png" | null {
  if (data.subarray(0, 4).toString("hex") === "25504446") return "pdf";
  if (data.subarray(0, 3).toString("hex") === "ffd8ff") return "jpg";
  if (data.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  return null;
}

export async function uploadStudentDocumentAction(formData: FormData) {
  const student = await requireStudent();
  const title = String(formData.get("title") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "OTHER");
  const file = formData.get("file");
  if (title.length < 1 || title.length > 120) throw new Error("Введите название до 120 символов.");
  if (!(file instanceof File)) throw new Error("Выберите файл.");
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error("Файл должен быть от 1 байта до 10 МБ.");
  const data = Buffer.from(await file.arrayBuffer());
  const extension = detectType(data);
  if (!extension) throw new Error("Допустимы только PDF, JPG и PNG.");
  const count = await getPrisma().studentDocument.count({ where: { studentId: student.id } });
  if (count >= 200) throw new Error("Достигнут лимит личных документов.");
  const storedName = await fileStorage.save(data, extension);
  await getPrisma().studentDocument.create({
    data: {
      studentId: student.id,
      title,
      documentType: ["PASSPORT", "SNILS", "INSURANCE", "CONTRACT", "OTHER"].includes(documentType)
        ? documentType as "PASSPORT" | "SNILS" | "INSURANCE" | "CONTRACT" | "OTHER"
        : "OTHER",
      storedName,
      originalName: file.name.slice(0, 255),
      mimeType: extension === "pdf" ? "application/pdf" : extension === "jpg" ? "image/jpeg" : "image/png",
      size: file.size,
    },
  });
  redirect("/documents/mine");
}

export async function deleteStudentDocumentAction(formData: FormData) {
  const student = await requireStudent();
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Некорректный документ.");
  const document = await getPrisma().studentDocument.findFirst({
    where: { id, studentId: student.id },
  });
  if (!document) throw new Error("Документ не найден.");
  await getPrisma().studentDocument.delete({ where: { id } });
  await fileStorage.delete(document.storedName).catch(() => undefined);
  redirect("/documents/mine");
}

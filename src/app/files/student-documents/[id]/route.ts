import "server-only";

import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { fileStorage } from "@/lib/file-storage";
import { getPrisma } from "@/lib/prisma";
import { requireStudentContext } from "@/lib/student";
import { requireStaffContext } from "@/lib/staff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();

  let studentId: number | null = null;
  try {
    const context = await requireStudentContext();
    studentId = context.student.id;
  } catch {
    try {
      await requireStaffContext();
    } catch {
      notFound();
    }
  }

  const document = await getPrisma().studentDocument.findUnique({
    where: { id: numericId },
  });
  if (!document) notFound();
  if (studentId !== null && document.studentId !== studentId) notFound();
  const data = await fileStorage.read(document.storedName);
  const disposition =
    request.nextUrl.searchParams.get("download") === "1"
      ? "attachment"
      : "inline";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(document.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

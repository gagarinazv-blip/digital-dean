import { assertSameSiteRequest } from "@/lib/auth";
import { getPortfolioActor } from "@/lib/portfolio-auth";
import {
  createPortfolioItem,
  PortfolioError,
} from "@/lib/portfolio";
import type { PortfolioFieldErrors } from "@/lib/portfolio-form";
import {
  validatePortfolioMetadata,
  validatePortfolioUpload,
} from "@/lib/portfolio-validation";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function responseError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: privateHeaders });
}

function fieldErrorResponse(fieldErrors: PortfolioFieldErrors): Response {
  return Response.json(
    { error: "Проверьте выделенные поля.", fieldErrors },
    { status: 400, headers: privateHeaders },
  );
}

function parseId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    await assertSameSiteRequest();
  } catch {
    return responseError("Недопустимый источник запроса.", 403);
  }

  const actor = await getPortfolioActor();
  if (!actor) return responseError("Требуется авторизация.", 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return responseError("Не удалось прочитать форму загрузки.", 400);
  }

  const metadataResult = validatePortfolioMetadata(
    {
      title: formData.get("title"),
      category: formData.get("category"),
      eventName: formData.get("eventName"),
      eventDate: formData.get("eventDate"),
      role: formData.get("role"),
      description: formData.get("description"),
    },
    actor.role === "STAFF",
  );
  if (!metadataResult.ok) return fieldErrorResponse(metadataResult.errors);

  const upload = formData.get("file");
  if (!upload || typeof upload === "string" || upload.size < 1) {
    return fieldErrorResponse({ file: "Выберите файл PDF, JPG или PNG." });
  }
  const fileResult = await validatePortfolioUpload(upload);
  if (!fileResult.ok) return fieldErrorResponse({ file: fileResult.error });

  const studentId =
    actor.role === "STUDENT" ? actor.studentId : parseId(formData.get("studentId"));
  if (studentId === null) {
    return responseError("Выберите студента.", 400);
  }

  const folderId =
    actor.role === "STUDENT" && formData.get("folderId")
      ? parseId(formData.get("folderId"))
      : null;
  if (
    actor.role === "STUDENT" &&
    formData.get("folderId") &&
    folderId === null
  ) {
    return fieldErrorResponse({ folderId: "Выбранная папка недействительна." });
  }

  try {
    const item = await createPortfolioItem({
      actor,
      studentId,
      folderId,
      metadata: metadataResult.value,
      file: fileResult.file,
    });
    return Response.json(
      { id: item.id, message: "Достижение добавлено." },
      { status: 201, headers: privateHeaders },
    );
  } catch (error) {
    if (error instanceof PortfolioError) {
      return responseError(error.message, error.status);
    }
    console.error("[portfolio:create] Не удалось сохранить достижение.", {
      userId: actor.userId,
      error,
    });
    return responseError("Не удалось сохранить достижение. Попробуйте ещё раз.", 500);
  }
}

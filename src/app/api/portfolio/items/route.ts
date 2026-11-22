import { assertSameSiteRequest } from "@/lib/auth";
import { getPortfolioActor } from "@/lib/portfolio-auth";
import {
  createPortfolioItem,
  PortfolioError,
} from "@/lib/portfolio";
import {
  parsePortfolioMetadata,
  validatePortfolioUpload,
} from "@/lib/portfolio-validation";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function responseError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: privateHeaders });
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

  const metadataResult = parsePortfolioMetadata(
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
  if (!metadataResult.ok) return responseError(metadataResult.error, 400);

  const upload = formData.get("file");
  if (!upload || typeof upload === "string" || upload.size < 1) {
    return responseError("Выберите файл PDF, JPG или PNG.", 400);
  }
  const fileResult = await validatePortfolioUpload(upload);
  if (!fileResult.ok) return responseError(fileResult.error, 400);

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
    return responseError("Выбранная папка недействительна.", 400);
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
    console.error("Portfolio item creation failed.");
    return responseError("Не удалось сохранить достижение.", 500);
  }
}

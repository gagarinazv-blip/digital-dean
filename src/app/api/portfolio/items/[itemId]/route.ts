import { assertSameSiteRequest } from "@/lib/auth";
import { getPortfolioActor } from "@/lib/portfolio-auth";
import {
  PortfolioError,
  updatePortfolioItem,
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

function parseId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  try {
    await assertSameSiteRequest();
  } catch {
    return responseError("Недопустимый источник запроса.", 403);
  }
  const actor = await getPortfolioActor();
  if (!actor) return responseError("Требуется авторизация.", 401);

  const itemId = parseId((await params).itemId);
  if (itemId === null) return responseError("Запись не найдена.", 404);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return responseError("Не удалось прочитать форму.", 400);
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
    true,
  );
  if (!metadataResult.ok) return responseError(metadataResult.error, 400);

  const upload = formData.get("file");
  let replacement;
  if (upload && typeof upload !== "string" && upload.size > 0) {
    const fileResult = await validatePortfolioUpload(upload);
    if (!fileResult.ok) return responseError(fileResult.error, 400);
    replacement = fileResult.file;
  } else if (upload && typeof upload === "string" && upload.length > 0) {
    return responseError("Выберите корректный файл.", 400);
  }

  try {
    const item = await updatePortfolioItem({
      actor,
      itemId,
      metadata: metadataResult.value,
      replacement,
    });
    return Response.json(
      { id: item.id, message: "Изменения сохранены." },
      { headers: privateHeaders },
    );
  } catch (error) {
    if (error instanceof PortfolioError) {
      return responseError(error.message, error.status);
    }
    console.error("Portfolio item update failed.");
    return responseError("Не удалось сохранить изменения.", 500);
  }
}

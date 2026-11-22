import { assertSameSiteRequest } from "@/lib/auth";
import { getPortfolioActor } from "@/lib/portfolio-auth";
import {
  createPortfolioFolder,
  deletePortfolioFolder,
  deletePortfolioItem,
  movePortfolioItem,
  PortfolioError,
  renamePortfolioFolder,
} from "@/lib/portfolio";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseId(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    (typeof value !== "string" || !/^[1-9]\d*$/.test(value))
  ) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function responseError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: privateHeaders });
}

export async function POST(request: Request): Promise<Response> {
  try {
    await assertSameSiteRequest();
  } catch {
    return responseError("Недопустимый источник запроса.", 403);
  }
  const actor = await getPortfolioActor();
  if (!actor) return responseError("Требуется авторизация.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return responseError("Некорректный запрос.", 400);
  }
  if (!isRecord(body) || typeof body.action !== "string") {
    return responseError("Некорректный запрос.", 400);
  }

  try {
    switch (body.action) {
      case "create-folder":
        if (
          actor.role !== "STUDENT" ||
          actor.studentId === null ||
          typeof body.name !== "string"
        ) {
          return responseError("Действие недоступно.", 403);
        }
        await createPortfolioFolder(actor.studentId, body.name);
        break;
      case "rename-folder": {
        const folderId = parseId(body.folderId);
        if (
          actor.role !== "STUDENT" ||
          actor.studentId === null ||
          folderId === null ||
          typeof body.name !== "string"
        ) {
          return responseError("Действие недоступно.", 403);
        }
        await renamePortfolioFolder(actor.studentId, folderId, body.name);
        break;
      }
      case "delete-folder": {
        const folderId = parseId(body.folderId);
        if (
          actor.role !== "STUDENT" ||
          actor.studentId === null ||
          folderId === null
        ) {
          return responseError("Действие недоступно.", 403);
        }
        await deletePortfolioFolder(actor.studentId, folderId);
        break;
      }
      case "move-item": {
        const itemId = parseId(body.itemId);
        const folderId =
          body.folderId === null || body.folderId === ""
            ? null
            : parseId(body.folderId);
        if (
          actor.role !== "STUDENT" ||
          actor.studentId === null ||
          itemId === null ||
          (body.folderId !== null &&
            body.folderId !== "" &&
            folderId === null)
        ) {
          return responseError("Действие недоступно.", 403);
        }
        await movePortfolioItem(actor, itemId, folderId);
        break;
      }
      case "delete-item": {
        const itemId = parseId(body.itemId);
        if (itemId === null) return responseError("Запись не найдена.", 404);
        await deletePortfolioItem(actor, itemId);
        break;
      }
      default:
        return responseError("Неизвестное действие.", 400);
    }
    return Response.json({ message: "Изменения сохранены." }, {
      headers: privateHeaders,
    });
  } catch (error) {
    if (error instanceof PortfolioError) {
      return responseError(error.message, error.status);
    }
    console.error("Portfolio action failed.");
    return responseError("Не удалось выполнить действие.", 500);
  }
}

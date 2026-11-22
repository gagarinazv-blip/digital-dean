import {
  getCurrentSessionRateLimitKey,
  getCurrentUser,
} from "@/lib/auth";
import { resolveSearchUser } from "@/lib/search/access";
import { parseSearchQuery } from "@/lib/search/query";
import { consumeSearchRateLimit } from "@/lib/search/rate-limit";
import { searchSite } from "@/lib/search/registry";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "Войдите в систему, чтобы искать." },
      { status: 401, headers: privateHeaders },
    );
  }
  if (user.requiresPasswordSetup) {
    return Response.json(
      { error: "Завершите настройку пароля, чтобы продолжить." },
      { status: 403, headers: privateHeaders },
    );
  }

  const url = new URL(request.url);
  const parsedQuery = parseSearchQuery(url.searchParams.get("q"));
  if (!parsedQuery.ok) {
    const message =
      parsedQuery.error === "too_long"
        ? "Запрос не должен превышать 100 символов."
        : parsedQuery.error === "too_short" || parsedQuery.error === "empty"
          ? "Введите не менее двух символов."
          : "Некорректный поисковый запрос.";
    return Response.json(
      { error: message },
      { status: 400, headers: privateHeaders },
    );
  }

  const sessionKey = await getCurrentSessionRateLimitKey();
  if (!sessionKey) {
    return Response.json(
      { error: "Войдите в систему, чтобы искать." },
      { status: 401, headers: privateHeaders },
    );
  }
  if (!consumeSearchRateLimit(sessionKey)) {
    return Response.json(
      { error: "Слишком много запросов. Попробуйте через минуту." },
      { status: 429, headers: privateHeaders },
    );
  }

  const searchUser = await resolveSearchUser(user);
  if (!searchUser) {
    return Response.json(
      { error: "У вас нет доступа к поиску." },
      { status: 403, headers: privateHeaders },
    );
  }

  const groups = await searchSite(parsedQuery.query, searchUser, 5);
  return Response.json(
    { query: parsedQuery.query.value, groups },
    { headers: privateHeaders },
  );
}

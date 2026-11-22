import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { CampusLayout } from "@/components/campus-layout";
import { SearchHighlight } from "@/components/search-highlight";
import { StaffLayout } from "@/components/staff-layout";
import { countUnreadStudentNotifications } from "@/lib/notification-data";
import { getCurrentUser } from "@/lib/auth";
import { resolveSearchUser } from "@/lib/search/access";
import { parseSearchQuery } from "@/lib/search/query";
import { searchSite } from "@/lib/search/registry";
import type { SearchGroup } from "@/lib/search/types";
import styles from "./search.module.css";

export const instant = false;

type SearchParams = {
  q?: string | string[];
  page?: string | string[];
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getPageNumber(value: string | string[] | undefined): number {
  const rawPage = firstValue(value);
  if (!rawPage) return 1;
  if (!/^\d+$/.test(rawPage)) return 0;
  const page = Number(rawPage);
  return Number.isSafeInteger(page) && page >= 1 && page <= 100 ? page : 0;
}

function getSearchMessage(error: string | null): string {
  switch (error) {
    case "empty":
      return "Введите запрос не короче двух символов.";
    case "too_short":
      return "Введите не менее двух символов.";
    case "too_long":
      return "Запрос не должен превышать 100 символов.";
    case "invalid":
      return "Некорректный поисковый запрос.";
    default:
      return "Ничего не найдено. Попробуйте изменить запрос.";
  }
}

function ResultsGroups({
  groups,
  terms,
}: {
  groups: SearchGroup[];
  terms: string[];
}) {
  return (
    <div className={styles.groups}>
      {groups.map((group, index) => (
        <section
          aria-labelledby={`search-group-${index}`}
          className={styles.group}
          key={group.name}
        >
          <header className={styles.groupHeading}>
            <h2 id={`search-group-${index}`}>{group.name}</h2>
            <span>
              {group.results.length}
              {group.hasMore ? "+" : ""}
            </span>
          </header>
          <div className={styles.results}>
            {group.results.map((result) => (
              <Link className={styles.result} href={result.href} key={result.id}>
                <strong>
                  <SearchHighlight text={result.title} terms={terms} />
                </strong>
                <span>
                  <SearchHighlight text={result.subtitle} terms={terms} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.requiresPasswordSetup) {
    redirect(`/login?role=${currentUser.role.toLowerCase()}&step=password`);
  }

  const user = await resolveSearchUser(currentUser);
  if (!user) forbidden();

  const params = await searchParams;
  const rawQuery = firstValue(params.q);
  const page = getPageNumber(params.page);
  const parsed = parseSearchQuery(rawQuery);
  const validationError =
    page === 0 ? "invalid" : parsed.ok ? null : parsed.error;
  const groups =
    validationError || !parsed.ok || !user
      ? []
      : await searchSite(parsed.query, user, page * 10);
  const hasMore = groups.some((group) => group.hasMore);
  const content = (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Поиск по сайту</p>
        <h1>
          {rawQuery ? `Результаты: «${rawQuery}»` : "Результаты поиска"}
        </h1>
        <p className={styles.description}>
          Результаты показаны только в пределах доступных вам данных.
        </p>
      </header>
      {validationError ? (
        <p className={styles.emptyState}>
          {getSearchMessage(validationError)}
        </p>
      ) : groups.length === 0 ? (
        <p className={styles.emptyState}>Ничего не найдено</p>
      ) : (
        <ResultsGroups
          groups={groups}
          terms={parsed.ok ? parsed.query.terms : []}
        />
      )}
      {!validationError && hasMore && page < 100 && (
        <Link
          className={styles.loadMore}
          href={`/search?q=${encodeURIComponent(rawQuery)}&page=${page + 1}`}
          scroll={false}
        >
          Показать ещё
        </Link>
      )}
    </main>
  );

  if (user.role === "STUDENT") {
    const unreadNotificationCount = await countUnreadStudentNotifications(
      user.student.id,
    );
    return (
      <CampusLayout
        student={{ id: user.student.id, fullName: user.student.fullName }}
        unreadNotificationCount={unreadNotificationCount}
      >
        {content}
      </CampusLayout>
    );
  }

  return <StaffLayout staff={user.staff}>{content}</StaffLayout>;
}

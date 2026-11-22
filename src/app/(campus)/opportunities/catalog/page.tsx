import { DateTimeStack } from "@/components/date-time-stack";
import { Suspense } from "react";
import Link from "next/link";
import type {
  OpportunityCost,
  OpportunityDirection,
  OpportunityFormat,
  OpportunityType,
} from "@/generated/prisma/enums";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { BottomSheet } from "@/components/bottom-sheet";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { getDemoNow } from "@/lib/demo-date";
import {
  isStudentEligible,
  getOpportunityDetailFacts,
  opportunityDirectionLabels,
  opportunityDirections,
  opportunityTypeConfig,
  opportunityTypes,
  validateOpportunityDetails,
} from "@/lib/opportunity-catalog";
import {
  toggleOpportunityBookmarkAction,
} from "../actions";
import {
  OpportunityCategories,
  type OpportunityCategoryGroup,
} from "./opportunity-categories";
import styles from "./opportunities.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

const typeValues = new Set(opportunityTypes.map(({ value }) => value));
const directionValues = new Set(
  opportunityDirections.map(({ value }) => value),
);
const formats: OpportunityFormat[] = ["OFFLINE", "ONLINE", "HYBRID"];
const costs: OpportunityCost[] = ["FREE", "PAID"];
const courseValues = [1, 2, 3, 4, 5, 6];
const typeIconPaths: Record<string, string> = {
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22zM4 5.5v14A2.5 2.5 0 0 1 6.5 17H20",
  trophy: "M8 4h8v4a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 0v5m-4 4h8m-6-4h4",
  briefcase: "M3 8h18v12H3zM8 8V5h8v3M3 12h18m-11 0v2h4v-2",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14",
  coins: "M12 5c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3zm-7 3v5c0 1.7 3 3 7 3s7-1.3 7-3V8m-14 5v4c0 1.7 3 3 7 3",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm-9-10h18M12 2a15 15 0 0 1 0 20m0-20a15 15 0 0 0 0 20",
  group: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-7a4 4 0 0 1 0 8m5 9v-2a4 4 0 0 0-3-3.87",
  music: "M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm12-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3z",
  fitness: "M2 10v4m4-7v10m12-10v10m4-7v4M6 12h12",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z",
  sparkles: "m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3zm7 12 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z",
};
const categoryShortLabels: Partial<Record<OpportunityType, string>> = {
  CONFERENCE: "Конференции",
  CASE_CHAMPIONSHIP: "Кейс-чемпионаты",
  EXCHANGE: "Мобильность",
};
const applicationStatusLabels: Record<string, string> = {
  SUBMITTED: "Отправлена",
  IN_REVIEW: "На рассмотрении",
  NEEDS_INFO: "Нужны уточнения",
  ACCEPTED: "Одобрена",
  REJECTED: "Отклонена",
  WITHDRAWN: "Отозвана",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function queryString(params: SearchParams): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value) {
      query.set(key, value);
    }
  }
  return query;
}

function updateQuery(
  query: URLSearchParams,
  key: string,
  value: string | null,
): string {
  const next = new URLSearchParams(query);
  next.delete("page");
  if (value === null) next.delete(key);
  else next.set(key, value);
  return `/opportunities/catalog${next.size ? `?${next.toString()}` : ""}`;
}

function valueForCard(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const student = await requireStudent();
  const params = await searchParams;
  const query = queryString(params);
  const now = getDemoNow();
  const rawType = first(params.type);
  const selectedType = rawType && typeValues.has(rawType as OpportunityType)
    ? (rawType as OpportunityType)
    : null;
  const selectedDirections = query
    .getAll("direction")
    .filter((value): value is OpportunityDirection =>
      directionValues.has(value as OpportunityDirection),
    );
  const search = (first(params.q) ?? "").trim().slice(0, 100);
  const deadlineFilter = first(params.deadline);
  const deadlineUntil = first(params.until);
  const selectedCourse = Number(first(params.course));
  const course = courseValues.includes(selectedCourse) ? selectedCourse : null;
  const fitOnly = first(params.fit) === "me";
  const formatValue = first(params.format);
  const selectedFormat = formats.includes(formatValue as OpportunityFormat)
    ? (formatValue as OpportunityFormat)
    : null;
  const costValue = first(params.cost);
  const selectedCost = costs.includes(costValue as OpportunityCost)
    ? (costValue as OpportunityCost)
    : null;
  const mine = ["notApplied", "applied", "favorite"].includes(
    first(params.mine) ?? "",
  )
    ? first(params.mine)!
    : "all";
  const sort = ["new", "title"].includes(first(params.sort) ?? "")
    ? first(params.sort)!
    : "deadline";
  const pageNumber = Math.max(1, Math.min(100, Number(first(params.page)) || 1));

  const prisma = getPrisma();
  const [opportunities, applications, bookmarks, openOpportunities] =
    await Promise.all([
      prisma.opportunity.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ deadline: "asc" }, { id: "desc" }],
      }),
      prisma.opportunityApplication.findMany({
        where: { studentId: student.id },
        orderBy: { submittedAt: "desc" },
        select: { opportunityId: true, status: true },
      }),
      prisma.opportunityBookmark.findMany({
        where: { studentId: student.id },
        select: { opportunityId: true },
      }),
      prisma.opportunity.findMany({
        where: { status: "PUBLISHED", deadline: { gt: now } },
        select: { type: true },
      }),
    ]);

  const applicationByOpportunity = new Map<number, string>();
  for (const application of applications) {
    if (!applicationByOpportunity.has(application.opportunityId)) {
      applicationByOpportunity.set(
        application.opportunityId,
        application.status,
      );
    }
  }
  const bookmarkedIds = new Set(bookmarks.map(({ opportunityId }) => opportunityId));
  const openCounts = new Map<OpportunityType, number>();
  for (const opportunity of openOpportunities) {
    openCounts.set(
      opportunity.type,
      (openCounts.get(opportunity.type) ?? 0) + 1,
    );
  }

  const filtered = opportunities.filter((opportunity) => {
    if (selectedType && opportunity.type !== selectedType) return false;
    if (
      search &&
      !`${opportunity.title} ${opportunity.organizer} ${opportunity.shortDescription || opportunity.description}`
        .toLocaleLowerCase("ru-RU")
        .includes(search.toLocaleLowerCase("ru-RU"))
    ) {
      return false;
    }
    if (
      selectedDirections.length > 0 &&
      !selectedDirections.some((direction) =>
        opportunity.directions.includes(direction),
      )
    ) {
      return false;
    }
    if (selectedFormat && opportunity.format !== selectedFormat) return false;
    if (selectedCost && opportunity.cost !== selectedCost) return false;
    if (course !== null) {
      const eligibility = isStudentEligible(
        opportunity,
        { course, faculty: student.faculty },
      );
      if (!eligibility.eligible) return false;
    }
    if (
      fitOnly &&
      !isStudentEligible(opportunity, {
        course: student.course,
        faculty: student.faculty,
      }).eligible
    ) {
      return false;
    }

    const remaining = opportunity.deadline.getTime() - now.getTime();
    if (deadlineFilter === "open" && remaining < 0) return false;
    if (deadlineFilter === "7d" && (remaining < 0 || remaining > 7 * 86_400_000)) return false;
    if (deadlineFilter === "14d" && (remaining < 0 || remaining > 14 * 86_400_000)) return false;
    if (deadlineFilter === "30d" && (remaining < 0 || remaining > 30 * 86_400_000)) return false;
    if (deadlineFilter === "until" && deadlineUntil) {
      const until = new Date(`${deadlineUntil}T23:59:59+03:00`);
      if (Number.isNaN(until.getTime()) || opportunity.deadline > until) return false;
    }

    const application = applicationByOpportunity.get(opportunity.id);
    if (mine === "notApplied" && application) return false;
    if (mine === "applied" && !application) return false;
    if (mine === "favorite" && !bookmarkedIds.has(opportunity.id)) return false;

    const details = validateOpportunityDetails(
      opportunity.type,
      opportunity.details as Record<string, unknown>,
    ).details;
    if (opportunity.type === "SPORT") {
      const sportDay = first(params.sportDay);
      const sportLevel = first(params.sportLevel);
      if (
        sportDay &&
        !valueForCard(details.schedule)
          .toLocaleLowerCase("ru-RU")
          .includes(sportDay.toLocaleLowerCase("ru-RU"))
      ) {
        return false;
      }
      if (
        sportLevel &&
        valueForCard(details.level).toLocaleLowerCase("ru-RU") !==
          sportLevel.toLocaleLowerCase("ru-RU")
      ) {
        return false;
      }
      if (first(params.additional) === "yes" && details.additionalRecruitment !== true) {
        return false;
      }
    }
    if (
      opportunity.type === "CULTURAL" &&
      ["yes", "no"].includes(first(params.audition) ?? "") &&
      details.auditionRequired !== (first(params.audition) === "yes")
    ) {
      return false;
    }
    if (
      opportunity.type === "INTERNSHIP" &&
      first(params.paid) === "yes" &&
      details.paid !== true
    ) {
      return false;
    }
    const teamSize = Number(first(params.teamSize));
    if (opportunity.type === "CASE_CHAMPIONSHIP" && teamSize > 0) {
      const min = typeof details.minTeamSize === "number" ? details.minTeamSize : 1;
      const max = typeof details.maxTeamSize === "number" ? details.maxTeamSize : 20;
      if (teamSize < min || teamSize > max) return false;
    }
    return true;
  });

  filtered.sort((left, right) => {
    if (sort === "new") return right.createdAt.getTime() - left.createdAt.getTime();
    if (sort === "title") return left.title.localeCompare(right.title, "ru");
    const leftOpen = left.deadline.getTime() > now.getTime();
    const rightOpen = right.deadline.getTime() > now.getTime();
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
    return left.deadline.getTime() - right.deadline.getTime();
  });

  const count = filtered.length;
  const visible = filtered.slice(0, pageNumber * 12);
  const currentPath = `/opportunities/catalog${query.size ? `?${query}` : ""}`;
  const deadlineLabel: Record<string, string> = {
    open: "Только открытые",
    "7d": "Ближайшие 7 дней",
    "14d": "До 14 дней",
    "30d": "До 30 дней",
    until: deadlineUntil ? `До ${deadlineUntil}` : "Выбрать дату",
  };
  const activeFilters = [
    search ? { key: "q", label: `Поиск: ${search}` } : null,
    selectedType
      ? { key: "type", label: opportunityTypeConfig[selectedType].label }
      : null,
    deadlineFilter
      ? { key: "deadline", label: deadlineLabel[deadlineFilter] ?? "Срок" }
      : null,
    selectedFormat
      ? { key: "format", label: { OFFLINE: "Очно", ONLINE: "Онлайн", HYBRID: "Гибрид" }[selectedFormat] }
      : null,
    selectedCost
      ? { key: "cost", label: selectedCost === "FREE" ? "Бесплатно" : "Платно" }
      : null,
  ].filter((item): item is { key: string; label: string } => item !== null);
  const categoryGroups: OpportunityCategoryGroup[] = (
      ["SCIENCE_CAREER", "STUDENT_LIFE"] as const
  ).map((group) => {
      const categories = opportunityTypes
        .filter((item) => item.group === group)
        .filter((item) => item.value !== "OTHER" || (openCounts.get(item.value) ?? 0) > 0)
        .map((item) => ({
          type: item.value,
          href: updateQuery(query, "type", item.value),
          fullLabel: item.label,
          shortLabel: categoryShortLabels[item.value] ?? item.label,
          iconPath: typeIconPaths[item.icon] ?? typeIconPaths.sparkles,
          count: openCounts.get(item.value) ?? 0,
        }));

      return {
        id: group.toLowerCase(),
        label: group === "SCIENCE_CAREER" ? "Наука и карьера" : "Студенческая жизнь",
        count: categories.reduce((total, category) => total + category.count, 0),
        categories,
      };
  });
  const selectedLabel = selectedType
      ? opportunityTypeConfig[selectedType].label
      : "Все возможности";
  const selectedCount = selectedType
      ? openCounts.get(selectedType) ?? 0
      : openOpportunities.length;

  function renderFilters() {
      return (
        <form method="get" action="/opportunities/catalog" className={styles.filters}>
          {selectedType && <input type="hidden" name="type" value={selectedType} />}
          <h2>Фильтры</h2>
          <label>
            Поиск
            <input
              type="search"
              name="q"
              maxLength={100}
              placeholder="Название, организатор"
              defaultValue={search}
            />
          </label>
          <label>
            Дедлайн
            <select name="deadline" defaultValue={deadlineFilter ?? ""}>
              <option value="">Любой срок</option>
              <option value="open">Только открытые</option>
              <option value="7d">Ближайшие 7 дней</option>
              <option value="14d">До 14 дней</option>
              <option value="30d">До 30 дней</option>
              <option value="until">Выбрать дату (до)</option>
            </select>
          </label>
          {deadlineFilter === "until" && (
            <label>
              Дата до
              <input type="date" name="until" defaultValue={deadlineUntil} />
            </label>
          )}
          <fieldset>
            <legend>Направление</legend>
            {opportunityDirections.map((direction) => (
              <label key={direction.value} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  name="direction"
                  value={direction.value}
                  defaultChecked={selectedDirections.includes(direction.value)}
                />
                {direction.label}
              </label>
            ))}
          </fieldset>
          <label>
            Курс
            <select name="course" defaultValue={course ?? ""}>
              <option value="">Любой</option>
              {courseValues.map((value) => (
                <option value={value} key={value}>{value} курс</option>
              ))}
            </select>
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" name="fit" value="me" defaultChecked={fitOnly} />
            Подходит мне
          </label>
          <label>
            Формат
            <select name="format" defaultValue={selectedFormat ?? ""}>
              <option value="">Любой</option>
              <option value="OFFLINE">Очно</option>
              <option value="ONLINE">Онлайн</option>
              <option value="HYBRID">Гибрид</option>
            </select>
          </label>
          <label>
            Стоимость
            <select name="cost" defaultValue={selectedCost ?? ""}>
              <option value="">Любая</option>
              <option value="FREE">Бесплатно</option>
              <option value="PAID">Платно</option>
            </select>
          </label>
          <label>
            Мои заявки
            <select name="mine" defaultValue={mine}>
              <option value="all">Все</option>
              <option value="notApplied">Не подавал</option>
              <option value="applied">Подал</option>
              <option value="favorite">В избранном</option>
            </select>
          </label>
          {selectedType === "SPORT" && (
            <>
              <label>
                День недели
                <select name="sportDay" defaultValue={first(params.sportDay) ?? ""}>
                  <option value="">Любой</option>
                  {["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"].map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </label>
              <label>
                Уровень
                <select name="sportLevel" defaultValue={first(params.sportLevel) ?? ""}>
                  <option value="">Любой</option>
                  <option value="Начинающий">Начинающий</option>
                  <option value="Любой">Любой</option>
                  <option value="Продвинутый">Продвинутый</option>
                </select>
              </label>
              <label className={styles.checkLabel}>
                <input type="checkbox" name="additional" value="yes" defaultChecked={first(params.additional) === "yes"} />
                Дополнительный набор
              </label>
            </>
          )}
          {selectedType === "CULTURAL" && (
            <label>
              Прослушивание
              <select name="audition" defaultValue={first(params.audition) ?? ""}>
                <option value="">Любое</option>
                <option value="yes">Требуется</option>
                <option value="no">Не требуется</option>
              </select>
            </label>
          )}
          {selectedType === "INTERNSHIP" && (
            <label className={styles.checkLabel}>
              <input type="checkbox" name="paid" value="yes" defaultChecked={first(params.paid) === "yes"} />
              Оплачиваемая
            </label>
          )}
          {selectedType === "CASE_CHAMPIONSHIP" && (
            <label>
              Размер команды
              <input type="number" name="teamSize" min={1} max={20} defaultValue={first(params.teamSize)} />
            </label>
          )}
          <label>
            Сортировка
            <select name="sort" defaultValue={sort}>
              <option value="deadline">Ближайший дедлайн</option>
              <option value="new">Новые</option>
              <option value="title">По названию</option>
            </select>
          </label>
          <button type="submit" className={styles.applyFilters}>Показать результаты</button>
          <Link href="/opportunities/catalog" className={styles.resetLink}>Сбросить фильтры</Link>
        </form>
      );
  }

  return (
    <CampusSection
      eyebrow="Возможности"
      title="Каталог"
      description="Программы, события и наборы для студентов."
    >
      <OpportunityCategories
        allCount={openOpportunities.length}
        allHref={updateQuery(query, "type", null)}
        allIconPath={typeIconPaths.sparkles}
        groups={categoryGroups}
        selectedCount={selectedCount}
        selectedLabel={selectedLabel}
        selectedType={selectedType}
      />

      <div className={styles.catalogLayout}>
        <aside
          aria-label="Фильтры каталога"
          className={`${styles.filterPanel} ${styles.desktopFilterPanel}`}
        >
          <details open>
            <summary>Фильтры</summary>
            <form method="get" action="/opportunities/catalog" className={styles.filters}>
            {selectedType && <input type="hidden" name="type" value={selectedType} />}
            <h2>Фильтры</h2>
            <label>
              Поиск
              <input
                type="search"
                name="q"
                maxLength={100}
                placeholder="Название, организатор"
                defaultValue={search}
              />
            </label>
            <label>
              Дедлайн
              <select name="deadline" defaultValue={deadlineFilter ?? ""}>
                <option value="">Любой срок</option>
                <option value="open">Только открытые</option>
                <option value="7d">Ближайшие 7 дней</option>
                <option value="14d">До 14 дней</option>
                <option value="30d">До 30 дней</option>
                <option value="until">Выбрать дату (до)</option>
              </select>
            </label>
            {deadlineFilter === "until" && (
              <label>
                Дата до
                <input type="date" name="until" defaultValue={deadlineUntil} />
              </label>
            )}
            <fieldset>
              <legend>Направление</legend>
              {opportunityDirections.map((direction) => (
                <label key={direction.value} className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    name="direction"
                    value={direction.value}
                    defaultChecked={selectedDirections.includes(direction.value)}
                  />
                  {direction.label}
                </label>
              ))}
            </fieldset>
            <label>
              Курс
              <select name="course" defaultValue={course ?? ""}>
                <option value="">Любой</option>
                {courseValues.map((value) => (
                  <option value={value} key={value}>{value} курс</option>
                ))}
              </select>
            </label>
            <label className={styles.checkLabel}>
              <input type="checkbox" name="fit" value="me" defaultChecked={fitOnly} />
              Подходит мне
            </label>
            <label>
              Формат
              <select name="format" defaultValue={selectedFormat ?? ""}>
                <option value="">Любой</option>
                <option value="OFFLINE">Очно</option>
                <option value="ONLINE">Онлайн</option>
                <option value="HYBRID">Гибрид</option>
              </select>
            </label>
            <label>
              Стоимость
              <select name="cost" defaultValue={selectedCost ?? ""}>
                <option value="">Любая</option>
                <option value="FREE">Бесплатно</option>
                <option value="PAID">Платно</option>
              </select>
            </label>
            <label>
              Мои заявки
              <select name="mine" defaultValue={mine}>
                <option value="all">Все</option>
                <option value="notApplied">Не подавал</option>
                <option value="applied">Подал</option>
                <option value="favorite">В избранном</option>
              </select>
            </label>
            {selectedType === "SPORT" && (
              <>
                <label>
                  День недели
                  <select name="sportDay" defaultValue={first(params.sportDay) ?? ""}>
                    <option value="">Любой</option>
                    {["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"].map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Уровень
                  <select name="sportLevel" defaultValue={first(params.sportLevel) ?? ""}>
                    <option value="">Любой</option>
                    <option value="Начинающий">Начинающий</option>
                    <option value="Любой">Любой</option>
                    <option value="Продвинутый">Продвинутый</option>
                  </select>
                </label>
                <label className={styles.checkLabel}>
                  <input type="checkbox" name="additional" value="yes" defaultChecked={first(params.additional) === "yes"} />
                  Дополнительный набор
                </label>
              </>
            )}
            {selectedType === "CULTURAL" && (
              <label>
                Прослушивание
                <select name="audition" defaultValue={first(params.audition) ?? ""}>
                  <option value="">Любое</option>
                  <option value="yes">Требуется</option>
                  <option value="no">Не требуется</option>
                </select>
              </label>
            )}
            {selectedType === "INTERNSHIP" && (
              <label className={styles.checkLabel}>
                <input type="checkbox" name="paid" value="yes" defaultChecked={first(params.paid) === "yes"} />
                Оплачиваемая
              </label>
            )}
            {selectedType === "CASE_CHAMPIONSHIP" && (
              <label>
                Размер команды
                <input type="number" name="teamSize" min={1} max={20} defaultValue={first(params.teamSize)} />
              </label>
            )}
            <label>
              Сортировка
              <select name="sort" defaultValue={sort}>
                <option value="deadline">Ближайший дедлайн</option>
                <option value="new">Новые</option>
                <option value="title">По названию</option>
              </select>
            </label>
            <button type="submit" className={styles.applyFilters}>Показать результаты</button>
            <Link href="/opportunities/catalog" className={styles.resetLink}>Сбросить фильтры</Link>
            </form>
          </details>
        </aside>
        <div className={styles.mobileFilterPanel}>
          <BottomSheet
            title="Фильтры каталога"
            triggerAriaLabel="Открыть фильтры каталога"
            triggerClassName={styles.mobileFilterTrigger}
            triggerLabel={
              <>
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 7h16M7 12h10m-7 5h4" />
                </svg>
                <span>Фильтры</span>
              </>
            }
          >
            {renderFilters()}
          </BottomSheet>
        </div>

        <section className={styles.results} aria-label="Результаты каталога">
          <div className={styles.resultsHeading}>
            <div className={styles.resultsTitle}>
              <h2>{selectedLabel}</h2>
              <p aria-live="polite">Найдено {count}</p>
            </div>
            {activeFilters.length > 0 && (
              <div className={styles.activeFilters} aria-label="Активные фильтры">
                {activeFilters.map((filter) => (
                  <Link key={filter.key} href={updateQuery(query, filter.key, null)}>
                    {filter.label} <span aria-hidden="true">×</span>
                  </Link>
                ))}
                <Link href="/opportunities/catalog">Сбросить всё</Link>
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>Ничего не найдено</h2>
              <p>Измените фильтры или посмотрите весь каталог.</p>
              <Link href="/opportunities/catalog">Сбросить фильтры</Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {visible.map((opportunity) => {
                const config = opportunityTypeConfig[opportunity.type];
                const details = validateOpportunityDetails(
                  opportunity.type,
                  opportunity.details as Record<string, unknown>,
                ).details;
                const isOpen = opportunity.deadline.getTime() >= now.getTime();
                const eligibility = isStudentEligible(opportunity, student);
                const returnTo = encodeURIComponent(currentPath);
                const status = applicationByOpportunity.get(opportunity.id);
                const cardSummary =
                  opportunity.shortDescription || opportunity.description.slice(0, 200);
                return (
                  <article className={styles.card} key={opportunity.id}>
                    <div className={styles.cardTop}>
                      <span className={styles.typeIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d={typeIconPaths[config.icon]} />
                        </svg>
                      </span>
                      <span className={styles.badge}>{config.label}</span>
                      <form action={toggleOpportunityBookmarkAction}>
                        <input type="hidden" name="opportunityId" value={opportunity.id} />
                        <input type="hidden" name="returnTo" value={currentPath} />
                        <button
                          type="submit"
                          className={styles.bookmark}
                          aria-label={bookmarkedIds.has(opportunity.id) ? "Убрать из избранного" : "В избранное"}
                          aria-pressed={bookmarkedIds.has(opportunity.id)}
                        >
                          {bookmarkedIds.has(opportunity.id) ? "В избранном" : "В избранное"}
                        </button>
                      </form>
                    </div>
                    <h2>
                      <Link
                        href={`/opportunities/${opportunity.id}?returnTo=${returnTo}`}
                        title={opportunity.title}
                      >
                        {opportunity.title}
                      </Link>
                    </h2>
                    <p className={styles.organizer}>{opportunity.organizer}</p>
                    <p className={styles.summary}>{cardSummary}</p>
                    {opportunity.type === "SPORT" && details.additionalRecruitment === true && (
                      <p className={styles.extraRecruitment}>
                        Дополнительный набор
                        {typeof details.freeSpots === "number" ? ` · ${details.freeSpots} мест` : ""}
                      </p>
                    )}
                    {Object.keys(details).length > 0 && (
                      <ul className={styles.facts}>
                        {getOpportunityDetailFacts(
                          opportunity.type,
                          details,
                        ).map((fact) => (
                          <li key={fact.label}>
                            <span>{fact.label}</span>
                            <strong>{fact.value}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className={styles.tags}>
                      {opportunity.directions.slice(0, 3).map((direction) => (
                        <span key={direction}>{opportunityDirectionLabels[direction]}</span>
                      ))}
                      {opportunity.directions.length > 3 && (
                        <span>+{opportunity.directions.length - 3}</span>
                      )}
                    </div>
                    <div className={styles.meta}>
                      <span>{opportunity.format === "ONLINE" ? "Онлайн" : opportunity.format === "HYBRID" ? "Гибрид" : "Очно"}</span>
                      <span>{opportunity.cost === "PAID" ? opportunity.costNote || "Платно" : "Бесплатно"}</span>
                      {(opportunity.minCourse || opportunity.maxCourse) && (
                        <span>
                          Для {opportunity.minCourse ?? 1}
                          {opportunity.maxCourse && opportunity.maxCourse !== opportunity.minCourse
                            ? `–${opportunity.maxCourse}`
                            : ""} курса
                        </span>
                      )}
                    </div>
                    <div className={`${styles.deadline} ${!isOpen ? styles.closed : ""}`}>
                      <span>{isOpen ? "Дедлайн" : "Приём закрыт"}</span>
                      <DateTimeStack
                        done={!isOpen}
                        kind="deadline"
                        value={opportunity.deadline}
                      />
                    </div>
                    {status && (
                      <p className={styles.applicationStatus}>
                        Моя заявка: {applicationStatusLabels[status] ?? status}
                      </p>
                    )}
                    {!eligibility.eligible && (
                      <p className={styles.ineligible}>{eligibility.reason}</p>
                    )}
                    <Link
                      className={styles.link}
                      href={`/opportunities/${opportunity.id}?returnTo=${returnTo}`}
                    >
                      Подробнее
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
          {visible.length < count && (
            <Link
              className={styles.loadMore}
              href={updateQuery(query, "page", String(pageNumber + 1))}
            >
              Показать ещё 12
            </Link>
          )}
        </section>
      </div>
    </CampusSection>
  );
}

export default function OpportunitiesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="Каталог возможностей" />}>
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  );
}

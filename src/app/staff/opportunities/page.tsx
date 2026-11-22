import { DateTimeStack } from "@/components/date-time-stack";
import { Suspense } from "react";
import Link from "next/link";
import type {
  OpportunityStatus as PrismaOpportunityStatus,
  OpportunityDirection,
  OpportunityType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { CampusLoading } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import { getDemoNow } from "@/lib/demo-date";
import {
  opportunityDirections,
  opportunityTypeConfig,
  opportunityTypes,
} from "@/lib/opportunity-catalog";
import { OpportunityForm } from "./opportunity-form";
import { OpportunityListActions } from "./opportunity-list-actions";
import { createOpportunityAction } from "./actions";
import styles from "./opportunities.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

const statuses: Record<PrismaOpportunityStatus, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  ARCHIVED: "Архив",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function StaffOpportunitiesContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffContext();
  const params = await searchParams;
  const rawType = first(params.type);
  const rawStatus = first(params.status);
  const rawDirection = first(params.direction);
  const type = opportunityTypes.some(({ value }) => value === rawType)
    ? (rawType as OpportunityType)
    : null;
  const status =
    rawStatus === "DRAFT" || rawStatus === "PUBLISHED" || rawStatus === "ARCHIVED"
      ? (rawStatus as PrismaOpportunityStatus)
      : null;
  const direction = opportunityDirections.some(
    (item) => item.value === rawDirection,
  )
    ? (rawDirection as OpportunityDirection)
    : null;
  const search = (first(params.q) ?? "").trim().slice(0, 100);
  const deadlineFilter = first(params.deadline);
  const now = getDemoNow();
  const where: Prisma.OpportunityWhereInput = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(direction ? { directions: { has: direction } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { organizer: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(deadlineFilter === "closed" ? { deadline: { lt: now } } : {}),
    ...(deadlineFilter === "open" ? { deadline: { gte: now } } : {}),
  };
  const [opportunities, facultyRows] = await Promise.all([
    getPrisma().opportunity.findMany({
      where,
      orderBy: [{ deadline: "asc" }, { id: "desc" }],
      include: { _count: { select: { applications: true } } },
    }),
    getPrisma().student.findMany({
      distinct: ["faculty"],
      select: { faculty: true },
      orderBy: { faculty: "asc" },
    }),
  ]);
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Сотрудникам</p>
          <h1>Возможности</h1>
          <p>Каталог программ, наборов и мероприятий для студентов.</p>
        </div>
      </header>

      <details className={styles.createPanel}>
        <summary>Добавить возможность</summary>
        <OpportunityForm
          action={createOpportunityAction}
          faculties={facultyRows.map(({ faculty }) => faculty)}
          submitLabel="Создать возможность"
        />
      </details>

      <section className={styles.listSection}>
        <div className={styles.listHeading}>
          <h2>Все возможности</h2>
          <span>{opportunities.length} найдено</span>
        </div>
        <form className={styles.filters} method="get" action="/staff/opportunities">
          <label>
            Поиск
            <input
              type="search"
              name="q"
              maxLength={100}
              defaultValue={search}
              placeholder="Название или организатор"
            />
          </label>
          <label>
            Тип
            <select name="type" defaultValue={type ?? ""}>
              <option value="">Все типы</option>
              {opportunityTypes.map((item) => (
                <option value={item.value} key={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            Статус
            <select name="status" defaultValue={status ?? ""}>
              <option value="">Все статусы</option>
              {Object.entries(statuses).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Направление
            <select name="direction" defaultValue={direction ?? ""}>
              <option value="">Все направления</option>
              {opportunityDirections.map((item) => (
                <option value={item.value} key={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            Дедлайн
            <select name="deadline" defaultValue={deadlineFilter ?? ""}>
              <option value="">Любой</option>
              <option value="open">Приём открыт</option>
              <option value="closed">Дедлайн прошёл</option>
            </select>
          </label>
          <button type="submit">Применить фильтры</button>
          <Link href="/staff/opportunities">Сбросить</Link>
        </form>

        {opportunities.length === 0 ? (
          <p className={styles.emptyState}>По этим условиям возможности не найдены.</p>
        ) : (
          <div className={styles.list}>
            {opportunities.map((item) => (
              <article className={styles.opportunityRow} key={item.id}>
                <div className={styles.rowCopy}>
                  <div className={styles.rowBadges}>
                    <span>{opportunityTypeConfig[item.type].label}</span>
                    <span data-status={item.status}>{statuses[item.status]}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.organizer}</p>
                  <p>Заявок: {item._count.applications}</p>
                  <DateTimeStack
                    done={item.status !== "PUBLISHED"}
                    kind="deadline"
                    value={item.deadline}
                  />
                </div>
                <div className={styles.rowLinks}>
                  <Link href={`/staff/opportunities/${item.id}/edit`}>Редактировать</Link>
                  <Link href={`/staff/opportunities/${item.id}/applications`}>Заявки</Link>
                  <OpportunityListActions
                    opportunityId={item.id}
                    hasApplications={item._count.applications > 0}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function StaffOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="возможности" />}>
      <StaffOpportunitiesContent searchParams={searchParams} />
    </Suspense>
  );
}

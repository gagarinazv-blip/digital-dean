import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { OpportunityType } from "@/generated/prisma/enums";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import {
  getOpportunityDetailFacts,
  isStudentEligible,
  opportunityDirectionLabels,
  opportunityTypeConfig,
  safeOpportunityReturnTo,
  validateOpportunityDetails,
} from "@/lib/opportunity-catalog";
import { parseRequirements } from "@/lib/opportunities";
import { getDemoNow } from "@/lib/demo-date";
import { toggleOpportunityBookmarkAction } from "../actions";
import styles from "./opportunity.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeZone: "Europe/Moscow",
  }).format(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Moscow",
  }).format(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function OpportunityContent({
  id,
  searchParams,
}: {
  id: number;
  searchParams: SearchParams;
}) {
  const student = await requireStudent();
  const prisma = getPrisma();
  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  if (!opportunity || opportunity.status !== "PUBLISHED") notFound();

  const now = getDemoNow();
  const [active, bookmark] = await Promise.all([
    prisma.opportunityApplication.findFirst({
      where: {
        opportunityId: id,
        studentId: student.id,
        status: { notIn: ["WITHDRAWN", "ACCEPTED", "REJECTED"] },
      },
      select: { publicId: true, status: true },
    }),
    prisma.opportunityBookmark.findUnique({
      where: {
        studentId_opportunityId: { studentId: student.id, opportunityId: id },
      },
      select: { studentId: true },
    }),
  ]);
  const returnTo = safeOpportunityReturnTo(first(searchParams.returnTo));
  const returnParam = encodeURIComponent(returnTo);
  const open = opportunity.deadline.getTime() >= now.getTime();
  const lateRequestAvailable =
    !open &&
    opportunity.allowLateRequests &&
    (!opportunity.lateRequestsUntil ||
      opportunity.lateRequestsUntil.getTime() >= now.getTime());
  const eligibility = isStudentEligible(opportunity, student);
  const requirements = parseRequirements(opportunity.requiredDocuments);
  const config = opportunityTypeConfig[opportunity.type as OpportunityType];
  const details = validateOpportunityDetails(
    opportunity.type,
    opportunity.details as Record<string, unknown>,
  ).details;
  const officialUrl = opportunity.officialUrl && isHttpUrl(opportunity.officialUrl)
    ? opportunity.officialUrl
    : null;

  return (
    <CampusSection
      eyebrow="Возможности · Каталог"
      title={opportunity.title}
      description={opportunity.organizer}
      headerAction={
        <Link className={styles.backLink} href={returnTo}>
          ← Ко всем возможностям
        </Link>
      }
    >
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <Link href="/opportunities/catalog">Возможности</Link>
        <span aria-hidden="true">/</span>
        <Link href={returnTo}>Каталог</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{opportunity.title}</span>
      </nav>
      <article className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.detailBadges}>
            <span className={styles.typeBadge}>{config.label}</span>
            {opportunity.type === "SPORT" && details.additionalRecruitment === true && (
              <span className={styles.recruitmentBadge}>
                Дополнительный набор
                {typeof details.freeSpots === "number" ? ` · ${details.freeSpots} мест` : ""}
              </span>
            )}
          </div>
          <h2>Описание</h2>
          <p className={styles.longText}>{opportunity.description}</p>
          <h2>Требования</h2>
          <p className={styles.longText}>{opportunity.requirements}</p>
          <h2>Ключевые факты</h2>
          <dl className={styles.facts}>
            {getOpportunityDetailFacts(opportunity.type, details).map(
              (fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ),
            )}
            <div>
              <dt>Направления</dt>
              <dd>
                {opportunity.directions.length > 0
                  ? opportunity.directions.map((direction) => opportunityDirectionLabels[direction]).join(", ")
                  : "Для всех направлений"}
              </dd>
            </div>
            <div>
              <dt>Формат</dt>
              <dd>{opportunity.format === "ONLINE" ? "Онлайн" : opportunity.format === "HYBRID" ? "Гибрид" : "Очно"}</dd>
            </div>
            <div>
              <dt>Стоимость</dt>
              <dd>{opportunity.cost === "PAID" ? opportunity.costNote || "Платно" : "Бесплатно"}</dd>
            </div>
            {opportunity.location && (
              <div><dt>Место проведения</dt><dd>{opportunity.location}</dd></div>
            )}
            {opportunity.startsAt && (
              <div><dt>Начало</dt><dd>{formatDateTime(opportunity.startsAt)}</dd></div>
            )}
            {opportunity.endsAt && (
              <div><dt>Окончание</dt><dd>{formatDateTime(opportunity.endsAt)}</dd></div>
            )}
            {(opportunity.minCourse || opportunity.maxCourse) && (
              <div>
                <dt>Курс</dt>
                <dd>
                  {opportunity.minCourse ?? 1}
                  {opportunity.maxCourse && opportunity.maxCourse !== opportunity.minCourse
                    ? `–${opportunity.maxCourse}`
                    : ""} курс
                </dd>
              </div>
            )}
            {opportunity.allowedFaculties.length > 0 && (
              <div>
                <dt>Факультеты</dt>
                <dd>{opportunity.allowedFaculties.join(", ")}</dd>
              </div>
            )}
            <div><dt>Дедлайн</dt><dd>{formatDate(opportunity.deadline)}</dd></div>
          </dl>
          {requirements.length > 0 && (
            <>
              <h2>Необходимые документы</h2>
              <ul className={styles.requirementList}>
                {requirements.map((item) => (
                  <li key={item.key}>
                    {item.title}{item.required ? " — обязательно" : " — по желанию"}
                  </li>
                ))}
              </ul>
            </>
          )}
          {officialUrl && (
            <a className={styles.officialLink} href={officialUrl} rel="noopener noreferrer" target="_blank">
              Официальная страница ↗
            </a>
          )}
        </section>

        <aside className={styles.applicationAside}>
          <div className={styles.detailActions}>
            <form action={toggleOpportunityBookmarkAction}>
              <input type="hidden" name="opportunityId" value={opportunity.id} />
              <input type="hidden" name="returnTo" value={`/opportunities/${id}?returnTo=${returnParam}`} />
              <button
                className={styles.bookmarkButton}
                type="submit"
                aria-pressed={Boolean(bookmark)}
              >
                {bookmark ? "Убрать из избранного" : "В избранное"}
              </button>
            </form>
          </div>
          <h2>Подача заявки</h2>
          <dl className={styles.studentFacts}>
            <dt>ФИО</dt><dd>{student.fullName}</dd>
            <dt>Курс и группа</dt><dd>{student.course} курс · {student.group.name}</dd>
            <dt>Факультет</dt><dd>{student.faculty}</dd>
          </dl>
          {active ? (
            <p className={styles.infoMessage}>Активная заявка уже отправлена.</p>
          ) : !eligibility.eligible ? (
            <p className={styles.errorMessage}>{eligibility.reason}</p>
          ) : open ? (
            <Link
              className={styles.submitButton}
              href={`/opportunities/${id}/apply?returnTo=${returnParam}`}
            >
              Подать заявку
            </Link>
          ) : lateRequestAvailable ? (
            <Link
              className={styles.submitButton}
              href={`/opportunities/${id}/apply?returnTo=${returnParam}&kind=LATE_REQUEST`}
            >
              Отправить индивидуальный запрос
            </Link>
          ) : (
            <p className={styles.errorMessage}>Приём закрыт.</p>
          )}
          {open && <p className={styles.deadlineText}>Дедлайн: {formatDate(opportunity.deadline)}</p>}
          {!open && lateRequestAvailable && opportunity.lateRequestsUntil && (
            <p className={styles.deadlineText}>
              Индивидуальные запросы принимаются до {formatDate(opportunity.lateRequestsUntil)}.
            </p>
          )}
        </aside>
      </article>
    </CampusSection>
  );
}

async function OpportunityParams({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[1-9]\d*$/.test(id)) notFound();
  return <OpportunityContent id={Number(id)} searchParams={query} />;
}

export default function OpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="мероприятие" />}>
      <OpportunityParams params={params} searchParams={searchParams} />
    </Suspense>
  );
}

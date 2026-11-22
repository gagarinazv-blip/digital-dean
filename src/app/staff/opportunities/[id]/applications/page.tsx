import { DateTimeStack } from "@/components/date-time-stack";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  OpportunityApplicationKind,
  OpportunityApplicationStatus,
} from "@/generated/prisma/enums";
import { CampusLoading } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import {
  applicationAnswersSchema,
  filterOpportunityApplicationAnswers,
  getOpportunityDetailFacts,
  validateOpportunityDetails,
} from "@/lib/opportunity-catalog";
import { OpportunityApplicationStatusForm } from "../../application-status-form";
import styles from "../../opportunities.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

const statusLabels: Record<OpportunityApplicationStatus, string> = {
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

function snapshotValue(snapshot: unknown, key: string): string {
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) {
    return "";
  }
  const value = (snapshot as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

async function StaffApplicationsContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffContext();
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  if (!/^[1-9]\d*$/.test(rawId)) notFound();
  const opportunityId = Number(rawId);
  const rawStatus = first(query.status);
  const status = [
    "SUBMITTED",
    "IN_REVIEW",
    "NEEDS_INFO",
    "ACCEPTED",
    "REJECTED",
    "WITHDRAWN",
  ].includes(rawStatus ?? "")
    ? (rawStatus as OpportunityApplicationStatus)
    : null;
  const rawKind = first(query.kind);
  const kind =
    rawKind === "STANDARD" || rawKind === "LATE_REQUEST"
      ? (rawKind as OpportunityApplicationKind)
      : null;
  const prisma = getPrisma();
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      title: true,
      type: true,
      details: true,
      directions: true,
    },
  });
  if (!opportunity) notFound();
  const applications = await prisma.opportunityApplication.findMany({
    where: {
      opportunityId,
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
    },
    orderBy: { submittedAt: "desc" },
    include: {
      student: {
        select: {
          fullName: true,
          course: true,
          faculty: true,
          group: { select: { name: true } },
        },
      },
      files: { orderBy: { id: "asc" } },
    },
  });
  const portfolioReferences = applications.flatMap((application) => {
    const answers = filterOpportunityApplicationAnswers(
      opportunity.type,
      application.details,
    );
    const ids = answers.portfolioItemIds;
    return Array.isArray(ids)
      ? ids
          .filter((id): id is number => typeof id === "number")
          .map((id) => ({ id, studentId: application.studentId }))
      : [];
  });
  const applicationPortfolioItems =
    portfolioReferences.length > 0
      ? await prisma.portfolioItem.findMany({
          where: {
            OR: portfolioReferences.map((reference) => ({
              id: reference.id,
              studentId: reference.studentId,
            })),
          },
          select: { id: true, studentId: true, title: true },
        })
      : [];
  const portfolioLabels = new Map(
    applicationPortfolioItems.map((item) => [
      `${item.studentId}:${item.id}`,
      item.title,
    ]),
  );
  const eventDetails = validateOpportunityDetails(
    opportunity.type,
    opportunity.details,
  ).details;
  const eventFacts = getOpportunityDetailFacts(opportunity.type, eventDetails);

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Сотрудникам · Возможности</p>
      <h1>Заявки: {opportunity.title}</h1>
      <p><Link href="/staff/opportunities">← К возможностям</Link></p>
      {eventFacts.length > 0 && (
        <section>
          <h2>Параметры возможности</h2>
          <dl className={styles.applicationDetails}>
            {eventFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <form className={styles.applicationFilters} method="get">
        <label>
          Статус
          <select name="status" defaultValue={status ?? ""}>
            <option value="">Все статусы</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Вид заявки
          <select name="kind" defaultValue={kind ?? ""}>
            <option value="">Все</option>
            <option value="STANDARD">Обычная</option>
            <option value="LATE_REQUEST">Индивидуальный запрос</option>
          </select>
        </label>
        <button type="submit">Применить</button>
        <Link href={`/staff/opportunities/${opportunityId}/applications`}>Сбросить</Link>
      </form>

      {applications.length === 0 ? (
        <p className={styles.emptyState}>Заявок по этим условиям пока нет.</p>
      ) : (
        <div className={styles.applicationList}>
          {applications.map((application) => {
            const answers = filterOpportunityApplicationAnswers(
              opportunity.type,
              application.details,
            );
            const answerFields = applicationAnswersSchema[
              opportunity.type
            ].fields.filter((field) => field.name !== "motivation");
            const snapshotName =
              snapshotValue(application.studentSnapshot, "fullName") ||
              application.student.fullName;
            return (
              <article
                className={styles.applicationCard}
                id={`application-${application.publicId}`}
                key={application.id}
              >
                <header className={styles.applicationHeader}>
                  <div>
                    <h2>{snapshotName}</h2>
                    <p>
                      {snapshotValue(application.studentSnapshot, "course") ||
                        application.student.course} курс ·{" "}
                      {snapshotValue(application.studentSnapshot, "groupName") ||
                        application.student.group.name}
                    </p>
                    <p>
                      {snapshotValue(application.studentSnapshot, "faculty") ||
                        application.student.faculty}
                    </p>
                    {snapshotValue(application.studentSnapshot, "phone") && (
                      <p>Телефон: {snapshotValue(application.studentSnapshot, "phone")}</p>
                    )}
                    {snapshotValue(application.studentSnapshot, "corporateEmail") && (
                      <p>Корпоративная почта: {snapshotValue(application.studentSnapshot, "corporateEmail")}</p>
                    )}
                  </div>
                  <div className={styles.applicationBadges}>
                    <span>{statusLabels[application.status]}</span>
                    <span data-kind={application.kind}>
                      {application.kind === "LATE_REQUEST"
                        ? "Индивидуальный запрос"
                        : "Обычная заявка"}
                    </span>
                  </div>
                </header>
                <div className={styles.applicationDate}>
                  <DateTimeStack value={application.submittedAt} />
                </div>
                {application.motivation && (
                  <section>
                    <h3>Мотивация</h3>
                    <p>{application.motivation}</p>
                  </section>
                )}
                {application.lateReason && (
                  <section>
                    <h3>Причина индивидуального запроса</h3>
                    <p>{application.lateReason}</p>
                  </section>
                )}
                {answerFields.some((field) => answers[field.name] !== undefined) && (
                  <section>
                    <h3>Ответы студента</h3>
                    <dl className={styles.applicationDetails}>
                      {answerFields.map((field) => {
                        const value = answers[field.name];
                        return value === undefined ? null : (
                          <div key={field.name}>
                            <dt>{field.label}</dt>
                            <dd>
                              {typeof value === "boolean"
                                ? value
                                  ? "Да"
                                  : "Нет"
                                : Array.isArray(value)
                                  ? value
                                      .map((item) =>
                                        field.name === "portfolioItemIds" &&
                                        typeof item === "number"
                                          ? portfolioLabels.get(
                                              `${application.studentId}:${item}`,
                                            ) ?? `Запись портфолио #${item}`
                                          : String(item),
                                      )
                                      .join(", ")
                                  : String(value)}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </section>
                )}
                <section>
                  <h3>Файлы</h3>
                  {application.files.length === 0 ? (
                    <p>Файлы не приложены.</p>
                  ) : (
                    <ul>
                      {application.files.map((file) => (
                        <li key={file.id}>
                          <span>{file.originalName}</span>
                          {" · "}
                          <a
                            href={`/files/opportunity-applications/${application.publicId}/${file.id}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Открыть
                          </a>
                          {" · "}
                          <a
                            href={`/files/opportunity-applications/${application.publicId}/${file.id}?download=1`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Скачать
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                {application.staffComment && (
                  <p className={styles.staffComment}>
                    Текущий комментарий: {application.staffComment}
                  </p>
                )}
                <OpportunityApplicationStatusForm
                  applicationId={application.id}
                  initialStatus={
                    application.status === "SUBMITTED"
                      ? "IN_REVIEW"
                      : application.status
                  }
                  initialComment={application.staffComment ?? ""}
                />
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function StaffApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="заявки на участие" />}>
      <StaffApplicationsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

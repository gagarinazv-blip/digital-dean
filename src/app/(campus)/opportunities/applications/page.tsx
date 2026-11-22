import { DateTimeStack } from "@/components/date-time-stack";
import { Suspense } from "react";
import Link from "next/link";
import type {
  OpportunityApplicationStatus,
  OpportunityType,
} from "@/generated/prisma/enums";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import {
  opportunityTypeConfig,
  opportunityTypes,
} from "@/lib/opportunity-catalog";
import { OpportunityApplicationWithdrawButton } from "../application-withdraw-button";
import styles from "./applications.module.css";

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

async function ApplicationsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const student = await requireStudent();
  const params = await searchParams;
  const rawStatus = first(params.status);
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
  const rawType = first(params.type);
  const type = opportunityTypes.some(({ value }) => value === rawType)
    ? (rawType as OpportunityType)
    : null;
  const success = first(params.submitted) === "1";
  const applications = await getPrisma().opportunityApplication.findMany({
    where: {
      studentId: student.id,
      ...(status ? { status } : {}),
      opportunity: {
        status: { not: "DRAFT" },
        ...(type ? { type } : {}),
      },
    },
    orderBy: { submittedAt: "desc" },
    include: {
      opportunity: {
        select: { id: true, title: true, type: true, status: true },
      },
      files: { orderBy: { id: "asc" } },
    },
  });

  return (
    <CampusSection
      eyebrow="Возможности"
      title="Мои заявки на участие"
      illustration="opportunities"
      tone="sand"
      description="Отслеживайте решения сотрудников и управляйте своими заявками."
    >
      {success && (
        <div className={styles.success} role="status" aria-live="polite">
          Заявка отправлена. Вы можете посмотреть её статус здесь или вернуться в каталог.
          <div>
            <Link href="/opportunities/catalog">Вернуться в каталог</Link>
            <Link href="/opportunities/portfolio">Открыть портфолио</Link>
          </div>
        </div>
      )}
      <form className={styles.filters} method="get" action="/opportunities/applications">
        <label>
          Тип возможности
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
            {Object.entries(statusLabels).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </label>
        <button type="submit">Применить</button>
        <Link href="/opportunities/applications">Сбросить</Link>
      </form>

      {applications.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Заявок пока нет</h2>
          <p>Выберите возможность в каталоге и отправьте заявку.</p>
          <Link href="/opportunities/catalog">Перейти в каталог</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {applications.map((application) => (
            <article
              className={styles.card}
              id={`application-${application.publicId}`}
              key={application.id}
            >
              <div className={styles.cardHeading}>
                <div>
                  <span className={styles.typeBadge}>
                    {opportunityTypeConfig[application.opportunity.type].label}
                  </span>
                  <h2>{application.opportunity.title}</h2>
                </div>
                <span className={styles.status} data-status={application.status}>
                  {statusLabels[application.status]}
                </span>
              </div>
              <div className={styles.meta}>
                <DateTimeStack value={application.submittedAt} />
                {application.kind === "LATE_REQUEST" ? (
                  <span>Индивидуальный запрос</span>
                ) : null}
              </div>
              {application.staffComment && (
                <p className={styles.comment}>
                  <strong>Комментарий сотрудника:</strong> {application.staffComment}
                </p>
              )}
              {application.files.length > 0 && (
                <ul className={styles.fileList}>
                  {application.files.map((file) => (
                    <li key={file.id}>
                      {file.originalName}:{" "}
                      <a
                        href={`/files/opportunity-applications/${application.publicId}/${file.id}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Открыть
                      </a>{" "}
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
              <div className={styles.actions}>
                {application.opportunity.status === "PUBLISHED" && (
                  <Link href={`/opportunities/${application.opportunity.id}`}>
                    К возможности
                  </Link>
                )}
                {!["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(application.status) && (
                  <OpportunityApplicationWithdrawButton publicId={application.publicId} />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </CampusSection>
  );
}

export default function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="заявки на участие" />}>
      <ApplicationsContent searchParams={searchParams} />
    </Suspense>
  );
}

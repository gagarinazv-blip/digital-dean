import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { getDemoNow } from "@/lib/demo-date";
import {
  isStudentEligible,
  opportunityTypeConfig,
  safeOpportunityReturnTo,
} from "@/lib/opportunity-catalog";
import {
  parseRequirements,
  type OpportunityRequirement,
} from "@/lib/opportunities";
import { submitOpportunityAction } from "../../actions";
import { OpportunityApplicationForm } from "../opportunity-application-form";
import styles from "../opportunity.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function ApplicationFileSlots({
  requirements,
  documents,
  portfolioItems,
}: {
  requirements: OpportunityRequirement[];
  documents: Array<{ id: number; title: string; originalName: string }>;
  portfolioItems: Array<{ id: number; title: string; originalName: string }>;
}) {
  if (requirements.length === 0) {
    return <p>Дополнительные документы для этой возможности не требуются.</p>;
  }
  return (
    <div className={styles.fileSlots}>
      {requirements.map((requirement) => (
        <fieldset className={styles.fileSlot} key={requirement.key}>
          <legend>
            {requirement.title}
            {requirement.required ? " · обязательно" : " · по желанию"}
          </legend>
          <label>
            Загрузить новый файл
            <input
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              multiple
              name={`upload_${requirement.key}`}
              type="file"
            />
          </label>
          <label>
            Выбрать из моих документов
            <select
              multiple
              name={`studentDocument_${requirement.key}`}
              aria-label={`Личные документы для ${requirement.title}`}
            >
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title} — {document.originalName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Выбрать из портфолио
            <select
              multiple
              name={`portfolioItem_${requirement.key}`}
              aria-label={`Файлы портфолио для ${requirement.title}`}
            >
              {portfolioItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} — {item.originalName}
                </option>
              ))}
            </select>
          </label>
          <p>До 3 файлов на слот, до 10 МБ каждый и 25 МБ суммарно. Выбранные файлы копируются в заявку.</p>
        </fieldset>
      ))}
    </div>
  );
}

async function ApplyContent({
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
  const open = opportunity.deadline.getTime() >= now.getTime();
  const lateAvailable =
    !open &&
    opportunity.allowLateRequests &&
    (!opportunity.lateRequestsUntil ||
      opportunity.lateRequestsUntil.getTime() >= now.getTime());
  const requestedLate = first(searchParams.kind) === "LATE_REQUEST";
  const isLate = !open && lateAvailable && requestedLate;
  const returnTo = safeOpportunityReturnTo(first(searchParams.returnTo));
  const eligibility = isStudentEligible(opportunity, student);
  const [active, documents, portfolioItems] = await Promise.all([
    prisma.opportunityApplication.findFirst({
      where: {
        opportunityId: id,
        studentId: student.id,
        status: { notIn: ["WITHDRAWN", "ACCEPTED", "REJECTED"] },
      },
      select: { publicId: true },
    }),
    prisma.studentDocument.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, originalName: true },
    }),
    prisma.portfolioItem.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, originalName: true },
    }),
  ]);
  const requirements = parseRequirements(opportunity.requiredDocuments);
  const submit = submitOpportunityAction.bind(null, id);
  const config = opportunityTypeConfig[opportunity.type];
  const canSubmit = !active && eligibility.eligible && (open || lateAvailable);

  return (
    <CampusSection
      eyebrow="Возможности · Заявка"
      title={`Заявка: ${opportunity.title}`}
      description="Проверьте данные, заполните ответы и приложите документы."
      headerAction={
        <Link
          className={styles.backLink}
          href={`/opportunities/${id}?returnTo=${encodeURIComponent(returnTo)}`}
        >
          ← Назад к возможности
        </Link>
      }
    >
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <Link href="/opportunities/catalog">Возможности</Link>
        <span aria-hidden="true">/</span>
        <Link href={returnTo}>Каталог</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/opportunities/${id}?returnTo=${encodeURIComponent(returnTo)}`}>
          {opportunity.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Заявка</span>
      </nav>
      <div className={styles.applyLayout}>
        <section className={styles.applicationAside}>
          <h2>Ваши данные</h2>
          <dl className={styles.studentFacts}>
            <dt>ФИО</dt><dd>{student.fullName}</dd>
            <dt>Курс и группа</dt><dd>{student.course} курс · {student.group.name}</dd>
            <dt>Факультет</dt><dd>{student.faculty}</dd>
            <dt>Направление</dt><dd>{student.direction}</dd>
          </dl>
          <p>Данные подставлены из профиля. Если они неверны, обратитесь в деканат.</p>
          <Link href={`/opportunities/catalog${returnTo.includes("?") ? returnTo.slice(returnTo.indexOf("?")) : ""}`}>
            К каталогу
          </Link>
        </section>

        <section className={styles.applicationAside}>
          {active ? (
            <p className={styles.infoMessage}>У вас уже есть активная заявка на эту возможность.</p>
          ) : !eligibility.eligible ? (
            <p className={styles.errorMessage}>{eligibility.reason}</p>
          ) : !open && !lateAvailable ? (
            <p className={styles.errorMessage}>Приём закрыт.</p>
          ) : !open && !requestedLate ? (
            <p className={styles.infoMessage}>
              Приём закрыт. Можно отправить индивидуальный запрос с причиной опоздания.
              <Link href={`?kind=LATE_REQUEST&returnTo=${encodeURIComponent(returnTo)}`}>
                Перейти к индивидуальному запросу
              </Link>
            </p>
          ) : canSubmit ? (
            <OpportunityApplicationForm
              action={submit}
              formId={`opportunity-application-${id}`}
              isLate={isLate}
            >
              <input
                type="hidden"
                name="kind"
                value={isLate ? "LATE_REQUEST" : "STANDARD"}
              />
              {isLate && (
                <label className={styles.formField}>
                  Причина индивидуального запроса
                  <textarea
                    name="lateReason"
                    minLength={20}
                    maxLength={1000}
                    required
                    aria-describedby={`late-reason-help-${id}`}
                  />
                  <span id={`late-reason-help-${id}`}>
                    Обязательно, от 20 до 1000 символов.
                  </span>
                </label>
              )}
              <label className={styles.formField}>
                Мотивация
                <textarea name="motivation" maxLength={2000} />
              </label>
              <h2>Ответы по типу возможности</h2>
              {config.fields.map((field) => (
                <label className={styles.formField} key={field.name}>
                  {field.label}{field.required ? " *" : ""}
                  {field.type === "textarea" ? (
                    <textarea
                      name={`detail_${field.name}`}
                      maxLength={field.maxLength}
                      required={field.required}
                    />
                  ) : field.type === "checkbox" ? (
                    <input
                      name={`detail_${field.name}`}
                      type="checkbox"
                      value="true"
                    />
                  ) : (
                    <input
                      name={`detail_${field.name}`}
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      maxLength={field.maxLength}
                      required={field.required}
                    />
                  )}
                </label>
              ))}
              <h2>Необходимые документы</h2>
              <ApplicationFileSlots
                requirements={requirements}
                documents={documents}
                portfolioItems={portfolioItems}
              />
            </OpportunityApplicationForm>
          ) : null}
          <p className={styles.returnNote}>
            <Link href={`/opportunities/${id}?returnTo=${encodeURIComponent(returnTo)}`}>
              Назад к возможности
            </Link>
          </p>
        </section>
      </div>
    </CampusSection>
  );
}

async function ApplyParams({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[1-9]\d*$/.test(id)) notFound();
  return <ApplyContent id={Number(id)} searchParams={query} />;
}

export default function OpportunityApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="форма заявки" />}>
      <ApplyParams params={params} searchParams={searchParams} />
    </Suspense>
  );
}

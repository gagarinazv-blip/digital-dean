import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { parseRequirements } from "@/lib/opportunities";
import { getDemoNow } from "@/lib/demo-date";
import { submitOpportunityAction } from "../actions";
import styles from "./opportunity.module.css";

async function OpportunityContent({ id }: { id: number }) {
  const student = await requireStudent();
  const opportunity = await getPrisma().opportunity.findUnique({ where: { id } });
  if (!opportunity || opportunity.status !== "PUBLISHED") notFound();
  const active = await getPrisma().opportunityApplication.findFirst({
    where: {
      opportunityId: id,
      studentId: student.id,
      status: { notIn: ["WITHDRAWN", "ACCEPTED", "REJECTED"] },
    },
  });
  const open = opportunity.deadline.getTime() > getDemoNow().getTime();
  const requirements = parseRequirements(opportunity.requiredDocuments);
  const submit = submitOpportunityAction.bind(null, id);

  return (
    <CampusSection eyebrow="Возможности" title={opportunity.title} description={opportunity.organizer}>
      <article className={styles.layout}>
        <section>
          <h2>Описание</h2>
          <p>{opportunity.description}</p>
          <h2>Требования</h2>
          <p>{opportunity.requirements}</p>
          {requirements.length > 0 && (
            <ul>{requirements.map((item) => <li key={item.key}>{item.title}{item.required ? " — обязательно" : ""}</li>)}</ul>
          )}
          {opportunity.officialUrl && (
            <a href={opportunity.officialUrl} rel="noopener noreferrer" target="_blank">Официальная страница</a>
          )}
        </section>
        <aside>
          <h2>Подача заявки</h2>
          <dl>
            <dt>ФИО</dt><dd>{student.fullName}</dd>
            <dt>Курс и группа</dt><dd>{student.course} курс · {student.group.name}</dd>
            <dt>Факультет</dt><dd>{student.faculty}</dd>
          </dl>
          {active ? <p>Активная заявка уже отправлена.</p> : open ? (
            <form action={submit}>
              <label htmlFor="motivation">Мотивация или комментарий</label>
              <textarea id="motivation" name="motivation" maxLength={2000} />
              <button type="submit">Подать заявку</button>
            </form>
          ) : <p>Приём заявок закрыт.</p>}
        </aside>
      </article>
    </CampusSection>
  );
}

export default function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CampusLoading label="мероприятие" />}>
      <OpportunityParams params={params} />
    </Suspense>
  );
}

async function OpportunityParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  return <OpportunityContent id={Number(id)} />;
}

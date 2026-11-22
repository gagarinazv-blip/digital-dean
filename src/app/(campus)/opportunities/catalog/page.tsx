import { Suspense } from "react";
import Link from "next/link";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { getDemoNow } from "@/lib/demo-date";
import styles from "./opportunities.module.css";

const typeLabels = {
  COMPETITION: "Конкурс",
  INTERNSHIP: "Стажировка",
  CONFERENCE: "Научная конференция",
  OTHER: "Другое",
};

async function CatalogContent() {
  const student = await requireStudent();
  const now = getDemoNow();
  const [opportunities, applications] = await Promise.all([
    getPrisma().opportunity.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ deadline: "asc" }, { id: "desc" }],
    }),
    getPrisma().opportunityApplication.findMany({
      where: { studentId: student.id },
      select: { opportunityId: true, status: true },
    }),
  ]);
  const applicationByOpportunity = new Map(
    applications.map((application) => [application.opportunityId, application.status]),
  );

  return (
    <CampusSection eyebrow="Возможности" title="Каталог" description="Конкурсы, стажировки и научные мероприятия.">
      {opportunities.length === 0 ? (
        <p role="status">Публикаций пока нет.</p>
      ) : (
        <div className={styles.grid}>
          {opportunities.map((opportunity) => {
            const open = opportunity.deadline.getTime() > now.getTime();
            const applicationStatus = applicationByOpportunity.get(opportunity.id);
            return (
              <article className={styles.card} key={opportunity.id}>
                <span className={styles.badge}>{typeLabels[opportunity.type]}</span>
                <h2>{opportunity.title}</h2>
                <p>{opportunity.organizer}</p>
                <p>{opportunity.description.slice(0, 180)}</p>
                <p className={open ? styles.deadline : styles.closed}>
                  {open ? `Приём до ${opportunity.deadline.toLocaleString("ru-RU")}` : "Приём закрыт"}
                </p>
                {applicationStatus && <p>Статус заявки: {applicationStatus}</p>}
                {open && (
                  <Link className={styles.link} href={`/opportunities/${opportunity.id}`}>
                    Открыть мероприятие
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </CampusSection>
  );
}

export default function OpportunitiesCatalogPage() {
  return (
    <Suspense fallback={<CampusLoading label="каталог возможностей" />}>
      <CatalogContent />
    </Suspense>
  );
}

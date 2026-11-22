import { Suspense } from "react";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { withdrawOpportunityAction } from "../actions";

async function ApplicationsContent() {
  const student = await requireStudent();
  const applications = await getPrisma().opportunityApplication.findMany({
    where: { studentId: student.id },
    orderBy: { submittedAt: "desc" },
    include: { opportunity: { select: { title: true } } },
  });
  return (
    <CampusSection eyebrow="Возможности" title="Мои заявки на участие" description="Заявки на мероприятия из каталога.">
      {applications.length === 0 ? <p>Вы ещё не подавали заявок.</p> : (
        <ul>
          {applications.map((application) => (
            <li key={application.id}>
              <strong>{application.opportunity.title}</strong>
              <p>Статус: {application.status}</p>
              {application.staffComment && <p>Комментарий: {application.staffComment}</p>}
              {!["WITHDRAWN", "ACCEPTED", "REJECTED"].includes(application.status) && (
                <form action={withdrawOpportunityAction}>
                  <input type="hidden" name="publicId" value={application.publicId} />
                  <button type="submit">Отозвать заявку</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </CampusSection>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<CampusLoading label="заявки на участие" />}>
      <ApplicationsContent />
    </Suspense>
  );
}

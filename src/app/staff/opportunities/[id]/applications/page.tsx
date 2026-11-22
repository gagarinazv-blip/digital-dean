import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CampusLoading } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import { updateOpportunityApplicationStatusAction } from "../../actions-status";

async function ApplicationsContent({ id }: { id: number }) {
  await requireStaffContext();
  const opportunity = await getPrisma().opportunity.findUnique({
    where: { id },
    include: {
      applications: {
        orderBy: { submittedAt: "desc" },
        include: { student: { select: { fullName: true, phone: true, course: true, group: { select: { name: true } } } } },
      },
    },
  });
  if (!opportunity) notFound();
  return (
    <main>
      <h1>Заявки: {opportunity.title}</h1>
      {opportunity.applications.length === 0 ? <p>Заявок пока нет.</p> : (
        <table>
          <thead><tr><th>Студент</th><th>Дата</th><th>Статус</th><th>Решение</th></tr></thead>
          <tbody>{opportunity.applications.map((application) => (
            <tr key={application.id}>
              <td>{application.student.fullName}<br />{application.student.group.name} · {application.student.course} курс</td>
              <td>{application.submittedAt.toLocaleString("ru-RU")}</td>
              <td>{application.status}</td>
              <td>
                <form action={updateOpportunityApplicationStatusAction}>
                  <input type="hidden" name="id" value={application.id} />
                  <select name="status" defaultValue={application.status}>
                    <option value="IN_REVIEW">На рассмотрении</option>
                    <option value="NEEDS_INFO">Нужны уточнения</option>
                    <option value="ACCEPTED">Одобрена</option>
                    <option value="REJECTED">Отклонена</option>
                  </select>
                  <input name="comment" defaultValue={application.staffComment ?? ""} placeholder="Комментарий" />
                  <button type="submit">Сохранить</button>
                </form>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </main>
  );
}

export default function StaffOpportunityApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CampusLoading label="заявки на мероприятие" />}>
      <ApplicationsParams params={params} />
    </Suspense>
  );
}

async function ApplicationsParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  return <ApplicationsContent id={Number(id)} />;
}

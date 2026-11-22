import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CampusLoading } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import { OpportunityForm } from "../../opportunity-form";
import { updateOpportunityAction } from "../../actions";
import styles from "../../opportunities.module.css";

async function EditOpportunityContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffContext();
  const { id: rawId } = await params;
  if (!/^[1-9]\d*$/.test(rawId)) notFound();
  const id = Number(rawId);
  const [opportunity, facultyRows] = await Promise.all([
    getPrisma().opportunity.findUnique({ where: { id } }),
    getPrisma().student.findMany({
      distinct: ["faculty"],
      select: { faculty: true },
      orderBy: { faculty: "asc" },
    }),
  ]);
  if (!opportunity) notFound();

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Сотрудникам · Возможности</p>
      <h1>Редактировать возможность</h1>
      <OpportunityForm
        action={updateOpportunityAction}
        faculties={facultyRows.map(({ faculty }) => faculty)}
        initial={opportunity}
        submitLabel="Сохранить изменения"
      />
    </main>
  );
}

export default function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="редактирование возможности" />}>
      <EditOpportunityContent params={params} />
    </Suspense>
  );
}

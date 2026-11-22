import { Suspense } from "react";
import Link from "next/link";
import { CampusLoading } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import { createOpportunityAction } from "./actions";
import styles from "./opportunities.module.css";

async function StaffOpportunitiesContent() {
  await requireStaffContext();
  const opportunities = await getPrisma().opportunity.findMany({
    orderBy: [{ deadline: "asc" }, { id: "desc" }],
  });
  return (
    <main className={styles.page}>
      <h1>Возможности</h1>
      <section>
        <h2>Добавить мероприятие</h2>
        <form action={createOpportunityAction} className={styles.form}>
          <label>Название<input name="title" maxLength={120} required /></label>
          <label>Тип<select name="type" required>
            <option value="COMPETITION">Конкурс</option>
            <option value="INTERNSHIP">Стажировка</option>
            <option value="CONFERENCE">Научная конференция</option>
            <option value="OTHER">Другое</option>
          </select></label>
          <label>Организатор<input name="organizer" maxLength={160} required /></label>
          <label>Описание<textarea name="description" required /></label>
          <label>Требования<textarea name="requirements" required /></label>
          <label>Дедлайн<input name="deadline" type="datetime-local" required /></label>
          <label>Ссылка<input name="officialUrl" type="url" placeholder="https://example.com/..." /></label>
          <label>Статус<select name="status"><option value="DRAFT">Черновик</option><option value="PUBLISHED">Опубликовано</option><option value="ARCHIVED">Архив</option></select></label>
          <button type="submit">Создать</button>
        </form>
      </section>
      <section>
        <h2>Мероприятия</h2>
        {opportunities.length === 0 ? <p>Мероприятий пока нет.</p> : (
          <ul>{opportunities.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> — {item.status} — до {item.deadline.toLocaleString("ru-RU")}{" "}
              <Link href={`/staff/opportunities/${item.id}/applications`}>Заявки</Link>
            </li>
          ))}</ul>
        )}
      </section>
    </main>
  );
}

export default function StaffOpportunitiesPage() {
  return (
    <Suspense fallback={<CampusLoading label="возможности" />}>
      <StaffOpportunitiesContent />
    </Suspense>
  );
}

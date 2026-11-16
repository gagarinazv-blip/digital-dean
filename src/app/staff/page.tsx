import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getRequestCatalogTitle } from "@/lib/request-catalog";
import { getStaffRequestList } from "@/lib/staff-data";
import styles from "@/app/sections.module.css";

export const instant = false;

const requestDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeZone: "Europe/Moscow",
});

export default async function StaffHomePage() {
  const { requests } = await getStaffRequestList();

  return (
    <CampusSection
      eyebrow="Кабинет сотрудника"
      title="Заявки"
      description="Здесь показаны ваши заявки и свободные заявки разрешённых вашему отделу типов."
    >
      {requests.length === 0 ? (
        <div className={styles.empty}>
          <strong>Доступных заявок пока нет</strong>
          <p>
            Новые заявки появятся здесь, когда их назначат вам или когда они
            подойдут вашему отделу.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {requests.map((request) => (
            <li className={styles.listItem} key={request.id}>
              <div className={styles.itemHeader}>
                <div>
                  <h2>
                    {getRequestCatalogTitle(
                      request.catalogCode,
                      requestTypeLabels[request.type],
                    )}
                  </h2>
                  <p>
                    {request.student.fullName} · группа{" "}
                    {request.student.group.name} · {request.student.course} курс
                  </p>
                </div>
                <span className={styles.badge}>
                  {requestStatusLabels[request.status]}
                </span>
              </div>
              <p>
                Создана {requestDateFormatter.format(request.createdAt)} ·{" "}
                {request.assignedToId === null
                  ? "Без назначения"
                  : "Ваша заявка"}
              </p>
              <Link
                className={styles.link}
                href={`/staff/requests/${request.id}`}
              >
                Открыть заявку
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CampusSection>
  );
}
